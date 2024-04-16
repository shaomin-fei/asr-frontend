import axios, { AxiosResponse } from "axios";

// const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
const apiBaseUrlPublic = process.env.REACT_APP_API_PUBLIC_BASE_URL;
const apiBaseUrlLocal = process.env.REACT_APP_API_BASE_URL;
// used to recognize the whole sentence, the vad end activity is detected
export interface SentenceRecognizeRequest {
  sampleRate: number;
  data: Float32Array;
}
export type IEParameters = {
  text: string;
  start: number;
  end: number;
  probability: number;
};
export type IEResult = {
  [key: string]: Array<IEParameters>;
};
export const isWakeUp = async (
  data: SentenceRecognizeRequest,
  useLocal: boolean,
) => {
  const buffer = data.data.buffer;
  const blob = new Blob([buffer]);
  let waveData = new FormData();
  waveData.append("sampleRate", data.sampleRate.toString());
  waveData.append("audio", blob, "wakeup.wav");
  const config = {
    headers: {
      "content-type": "multipart/form-data",
      enctype: "multipart/form-data",
    },
  };
  const result = (await axios.post(
    `${useLocal ? apiBaseUrlLocal : apiBaseUrlPublic}/wakeup`,
    waveData,
    config,
  )) as AxiosResponse<{ isWakeUp: boolean }>;
  return result.data;
};

// the endpoint will perform information extractation
export const recognizeCmd = async (
  data: SentenceRecognizeRequest,
  useLocal: boolean,
) => {
  const buffer = data.data.buffer;
  const blob = new Blob([buffer]);
  let waveData = new FormData();
  waveData.append("sampleRate", data.sampleRate.toString());
  waveData.append("audio", blob, "audio.wav");
  const config = {
    headers: {
      "content-type": "multipart/form-data",
      enctype: "multipart/form-data",
    },
  };
  const result = (await axios.post(
    `${useLocal ? apiBaseUrlLocal : apiBaseUrlPublic}/recognize/cmd`,
    waveData,
    config,
  )) as AxiosResponse<{
    text: string;
    parameters: IEResult;
    cmdType: string;
    success: boolean;
    ttsMessage: string;
  }>;
  return result.data;
};

export const recognizeStream = async (
  data: SentenceRecognizeRequest,
  useLocal: boolean,
) => {
  const buffer = data.data.buffer;
  const blob = new Blob([buffer]);
  let waveData = new FormData();
  waveData.append("sampleRate", data.sampleRate.toString());
  waveData.append("audio", blob, "audio.wav");
  const config = {
    headers: {
      "content-type": "multipart/form-data",
      enctype: "multipart/form-data",
    },
  };
  const result = (await axios.post(
    `${useLocal ? apiBaseUrlLocal : apiBaseUrlPublic}/recognize/stream`,
    waveData,
    config,
  )) as AxiosResponse<{
    text: string;
  }>;
  return result.data;
};
