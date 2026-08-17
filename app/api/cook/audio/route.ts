import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord } from '@/lib/db';
import { getHouseholdDateString } from '@/lib/cutoff';
import { generateBengaliCookingInstruction } from '@/lib/tts';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || getHouseholdDateString();
    const speedParam = url.searchParams.get('rate') || '+0%';

    const household = (db.prepare('SELECT * FROM households LIMIT 1').get() || { id: 'hh-flat-4b', default_meal_qty: 1 }) as HouseholdRecord;

    // Fetch the 3 meal-eating flatmates
    const users = (db.prepare(
      "SELECT id, name FROM users WHERE household_id = ? AND role IN ('admin', 'flatmate') AND id != 'usr-admin' ORDER BY name ASC"
    ).all(household.id) || []) as { id: string; name: string }[];

    // Fetch meals
    let totalMeals = 0;
    const flatmateMeals: { name: string; quantity: number }[] = [];
    for (const u of users) {
      const m = db.prepare('SELECT quantity FROM daily_meals WHERE household_id = ? AND user_id = ? AND date = ?').get(household.id, u.id, date) as { quantity: number } | undefined;
      const qty = m ? m.quantity : (household.default_meal_qty || 1);
      totalMeals += qty;
      flatmateMeals.push({ name: u.name, quantity: qty });
    }

    let specials: any[] = [];
    try {
      specials = db.prepare(`
        SELECT sr.*, u.name as user_name
        FROM special_requests sr
        JOIN users u ON sr.user_id = u.id
        WHERE sr.household_id = ? AND sr.date = ?
      `).all(household.id, date) as any[];
    } catch (_) {}

    // Format Bengali spoken script
    const bengaliText = generateBengaliCookingInstruction(
      date,
      totalMeals,
      flatmateMeals,
      specials.map(s => ({ itemName: s.item_name, quantity: s.quantity, notes: s.notes }))
    );

    // Cache directory in temporary or public storage
    const cacheDir = path.join(process.cwd(), 'public', 'audio_cache');
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch (_) {}

    const hash = crypto.createHash('md5').update(`${date}_${speedParam}_${bengaliText}`).digest('hex');
    const cacheFilePath = path.join(cacheDir, `${hash}.mp3`);

    if (fs.existsSync(cacheFilePath)) {
      const cachedBuffer = fs.readFileSync(cacheFilePath);
      return new NextResponse(cachedBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Generate high quality natural Bengali male neural voice (bn-BD-PradeepNeural)
    try {
      // @ts-ignore
      const { EdgeTTS } = await import('edge-tts-node');
      const tts = new EdgeTTS({
        voice: 'bn-BD-PradeepNeural',
        rate: speedParam === '-15%' ? '-10%' : '+0%'
      });

      const audioBuffer = await tts.synthesize(bengaliText);

      if (audioBuffer && audioBuffer.length > 0) {
        try {
          fs.writeFileSync(cacheFilePath, audioBuffer);
        } catch (_) {}

        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (edgeErr) {
      console.warn('EdgeTTS node fallback:', edgeErr);
    }

    // Secondary fallback: Google TTS stream
    const encodedText = encodeURIComponent(bengaliText);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=bn&client=tw-ob`;

    const audioRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (audioRes.ok) {
      const arrayBuffer = await audioRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      try {
        fs.writeFileSync(cacheFilePath, buffer);
      } catch (_) {}

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    throw new Error('Bengali TTS generation failed');
  } catch (error: any) {
    console.error('Audio Generation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
