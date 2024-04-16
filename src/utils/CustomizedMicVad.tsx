import {
  RealTimeVADOptions,
  defaultRealTimeVADOptions,
  AudioNodeVAD,
} from "@ricky0123/vad-web";
import { validateOptions } from "@ricky0123/vad-web/dist/_common";

export class CustomizedMicVad {
  static speechStart: boolean;
  static async new(
    options: Partial<RealTimeVADOptions> = {},
    dataIntercept?: (data: Float32Array) => Promise<void>,
    returnOnlySpeechStart: boolean = true,
  ) {
    const fullOptions: RealTimeVADOptions = {
      ...defaultRealTimeVADOptions,
      ...options,
    };
    validateOptions(fullOptions);

    let stream: MediaStream;
    if (fullOptions.stream === undefined)
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...fullOptions.additionalAudioConstraints,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });
    else stream = fullOptions.stream;

    const audioContext = new AudioContext();
    const sourceNode = new MediaStreamAudioSourceNode(audioContext, {
      mediaStream: stream,
    });

    const cachedSpeechEnd = fullOptions.onSpeechEnd;
    const cachedSpeechStart = fullOptions.onSpeechStart;

    fullOptions.onSpeechStart = () => {
      this.speechStart = true;
      if (cachedSpeechStart) {
        cachedSpeechStart();
      }
    };
    fullOptions.onSpeechEnd = async (audio: Float32Array) => {
      this.speechStart = false;
      if (cachedSpeechEnd) {
        cachedSpeechEnd(audio);
      }
    };

    const audioNodeVAD = await AudioNodeVAD.new(audioContext, fullOptions);
    audioNodeVAD.receive(sourceNode);

    const vad = new CustomizedMicVad(
      fullOptions,
      audioContext,
      stream,
      audioNodeVAD,
      sourceNode,
    );

    const cachedProcessFrame = audioNodeVAD.processFrame;
    audioNodeVAD.processFrame = async (frame: Float32Array) => {
      await cachedProcessFrame(frame);
      // intercept after start/stop is detected
      if (dataIntercept) {
        if (!returnOnlySpeechStart) {
          return await dataIntercept(frame);
        } else if (this.speechStart) {
          return await dataIntercept(frame);
        }
      }
    };

    return vad;
  }

  private constructor(
    public options: RealTimeVADOptions,
    private audioContext: AudioContext,
    private stream: MediaStream,
    private audioNodeVAD: AudioNodeVAD,
    private sourceNode: MediaStreamAudioSourceNode,
    private listening = false,
    public speechStart = false,
  ) {}

  pause = () => {
    this.audioNodeVAD.pause();
    this.listening = false;
    this.speechStart = false;
  };

  start = () => {
    this.audioNodeVAD.start();
    this.listening = true;
  };

  destroy = () => {
    if (this.listening) {
      this.pause();
    }
    if (this.options.stream === undefined) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.sourceNode.disconnect();
    this.audioNodeVAD.destroy();
    this.audioContext.close();
  };
}
