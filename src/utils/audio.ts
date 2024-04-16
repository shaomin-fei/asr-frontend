import { utils } from "@ricky0123/vad-react";

export const convertToWavFile = (audioData: Float32Array) => {
  const wavBuffer = utils.encodeWAV(audioData);
  const base64 = utils.arrayBufferToBase64(wavBuffer);
  const url = `data:audio/wav;base64,${base64}`;
  return url;
};

export class WaveFormate {
  formatTag = 0;
  channels = 1;
  samplePerSec = 0;
  avgBytesPerSec = 0;
  blockAlign = 0;
  bitsPerSample = 0;
  cbSize = 0;
}

function str2ArrayBuf(str: string) {
  const array = new TextEncoder().encode(str);
  return array;
}
export function base64ToBytes(base64: string) {
  const binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
  //return bytes.buffer;
}
export function arrayBufferToBase64(buffer: Int8Array) {
  const decoder = new TextDecoder("utf8");
  const b64encoded = btoa(decoder.decode(buffer));
  return b64encoded;
}

function writeString(waveData: ArrayBuffer, content: string, offset: number) {
  const temp = str2ArrayBuf(content);
  const buf = new Uint8Array(waveData, offset, temp.length);
  buf.set(temp, 0);
}
export function addWavHeaders(pcmData: Uint8Array, wf: WaveFormate) {
  const waveData = new ArrayBuffer(44 + pcmData.byteLength);
  const dataView = new DataView(waveData);
  let index = 0;
  const chunkID = str2ArrayBuf("RIFF");
  const chunkBuff = new Uint8Array(waveData, 0, 4);
  chunkBuff.set(chunkID, index);
  index += 4;
  dataView.setUint32(index, 36 + pcmData.byteLength, true);
  index += 4;
  writeString(waveData, "WAVE", index);
  index += 4;
  writeString(waveData, "fmt ", index);
  index += 4;
  dataView.setUint32(index, 16, true);
  index += 4;
  dataView.setUint16(index, 1, true);
  index += 2;
  dataView.setUint16(index, wf.channels, true);
  index += 2;
  dataView.setUint32(index, wf.samplePerSec, true);
  index += 4;
  dataView.setUint32(
    index,
    wf.channels * wf.samplePerSec * (wf.bitsPerSample / 8),
    true,
  );
  index += 4;
  dataView.setUint16(index, wf.channels * (wf.bitsPerSample / 8), true);
  index += 2;
  dataView.setUint16(index, wf.bitsPerSample, true);
  index += 2;
  writeString(waveData, "data", index);
  index += 4;
  dataView.setUint32(index, pcmData.byteLength, true);
  index += 4;
  const audioDataBuf = new Int8Array(waveData, index, pcmData.byteLength);
  audioDataBuf.set(new Int8Array(pcmData), 0);
  return new Int8Array(waveData);
}
