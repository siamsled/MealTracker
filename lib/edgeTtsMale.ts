import WebSocket from 'ws';
import crypto from 'crypto';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

function generateSecMsGec(): string {
  let ticks = Math.floor(Date.now() / 1000);
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const strToHash = ticks.toFixed(0) + TRUSTED_CLIENT_TOKEN;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

function dateToString(): string {
  const d = new Date();
  return d.toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
}

/**
 * Dynamically synthesizes clear, high-quality Bengali male voice (bn-BD-PradeepNeural)
 */
export function synthesizeMaleBengali(
  text: string,
  voice = 'bn-BD-PradeepNeural',
  speedParam = '+0%'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const secMsGec = generateSecMsGec();
    const connectionId = crypto.randomUUID().replace(/-/g, '');
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-143.0.3650.75&ConnectionId=${connectionId}`;
    const muid = crypto.randomBytes(16).toString('hex').toUpperCase();

    const ws = new WebSocket(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Cookie': `muid=${muid};`
      }
    });

    const audioChunks: Buffer[] = [];
    let isDone = false;

    ws.on('open', () => {
      const nowStr = dateToString();
      ws.send(
        `X-Timestamp:${nowStr}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`
      );

      const reqId = crypto.randomUUID().replace(/-/g, '');
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='${speedParam}' volume='+0%'>${escapedText}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${nowStr}Z\r\nPath:ssml\r\n\r\n${ssml}`);
    });

    ws.on('message', (data: any, isBinary: boolean) => {
      if (isBinary) {
        const buf = Buffer.from(data);
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        if (buf.length >= 2 + headerLen) {
          const header = buf.subarray(2, 2 + headerLen).toString('utf8');
          if (header.includes('Path:audio')) {
            const audio = buf.subarray(2 + headerLen);
            if (audio.length > 0) {
              audioChunks.push(audio);
            }
          }
        }
      } else {
        const str = data.toString();
        if (str.includes('Path:turn.end')) {
          if (!isDone) {
            isDone = true;
            try { ws.terminate(); } catch (_) {}
            const finalBuf = Buffer.concat(audioChunks);
            resolve(finalBuf);
          }
        }
      }
    });

    ws.on('error', (err) => {
      if (!isDone) {
        isDone = true;
        try { ws.terminate(); } catch (_) {}
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!isDone) {
        isDone = true;
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error('Edge TTS socket closed before receiving audio'));
        }
      }
    });

    setTimeout(() => {
      if (!isDone) {
        isDone = true;
        try { ws.terminate(); } catch (_) {}
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error('Edge TTS WebSocket timeout'));
        }
      }
    }, 8000);
  });
}
