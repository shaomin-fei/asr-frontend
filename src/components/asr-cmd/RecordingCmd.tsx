import { Grid, Typography, Button, Divider, Link } from "@mui/material";
import { useMicVAD } from "@ricky0123/vad-react";
import { useEffect, useState } from "react";

import Layout from "../Layout";
import { useLocation } from "react-router";
import { isWakeUp, recognizeCmd } from "../../api/speech_recognition";
import ReactAudioPlayer from "react-audio-player";
import { convertToWavFile } from "../../utils/audio";
import useTTS from "../../utils/useTTS";
import TTS from "../TTS";

const audioFileMap = {
  wakeup: `${process.env.REACT_APP_PUBLIC_URL}/asset/wav/wakeup.wav`,
  taskSuccess: `${process.env.REACT_APP_PUBLIC_URL}/asset/wav/task_success.wav`,
};
export enum FunctionOptions {
  CMD = "CMD",
  ASR = "ASR",
}

export const ms_each_frame = 80;
const sampleRate = 16000;
const sleep_after_seconds = 10;
let silence_for_second = 0;

const RecordingCmd = () => {
  const [status, setStatus] = useState("not speaking");
  const [isStart, setIsStart] = useState(false);
  const [wakeUp, setWakeup] = useState(false);
  const [playAudioFile, setPlayAudioFile] = useState<string | undefined>();
  const [startCountWakeupTime, setStartCountWakeupTime] = useState(false);
  const [recordedAudioFile, setRecordedAudioFile] = useState<
    string | undefined
  >();
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [cmdType, setCmdType] = useState<string>("");
  const [cmd, setCmd] = useState("");
  const [analyzeTime, setAnaylizeTime] = useState<number | undefined>();
  const { type, endAfterMs, useLocal } = useLocation().state as {
    type: FunctionOptions;
    endAfterMs: number;
    useLocal: boolean;
  };
  const ttsUrl = useLocal
    ? process.env.REACT_APP_TTS_LOCAL
    : process.env.REACT_APP_TTS_PUBLIC;

  const { readText, connectionStatus } = useTTS(ttsUrl || "");

  useEffect(() => {
    if (!wakeUp || !startCountWakeupTime) {
      return;
    }
    const interval = setInterval(() => {
      silence_for_second += 1;
      if (silence_for_second >= sleep_after_seconds) {
        setWakeup(false);
        silence_for_second = 0;
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      //console.log("clear interval");
    };
  }, [wakeUp, startCountWakeupTime]);
  // One frame is around 83 ms

  //  console.log("inside component");
  //  console.log(ort.env.wasm.wasmPaths);
  const vad = useMicVAD({
    additionalAudioConstraints: {
      sampleRate: sampleRate,
    },
    redemptionFrames: endAfterMs / ms_each_frame, // By default it's 8
    startOnLoad: false,
    workletURL: `${process.env.REACT_APP_PUBLIC_URL}/vad.worklet.bundle.min.js`,
    modelURL: `${process.env.REACT_APP_PUBLIC_URL}/silero_vad.onnx`,
    onSpeechStart: () => {
      setStatus("speaking");
      if (wakeUp) {
        silence_for_second = 0;
        setStartCountWakeupTime(false);
      }
    },
    onVADMisfire: async () => {
      setStatus("not speaking");
    },
    onSpeechEnd: async (audio: Float32Array) => {
      setStatus("not speaking");
      if (type === FunctionOptions.CMD) {
        if (!wakeUp) {
          // check wakeup
          const result = await isWakeUp(
            {
              sampleRate: sampleRate,
              data: audio,
            },
            useLocal,
          );
          if (result.isWakeUp) {
            setWakeup(true);
            setPlayAudioFile(audioFileMap.wakeup);
          }
        } else {
          // for test reason, show wav player
          const waveUrl = convertToWavFile(audio);
          setRecordedAudioFile(waveUrl);

          // recognize cmd
          // audio data is between -1 and 1, which is too small for the speech recoginition,
          // but good enough for vad and wakeup word detection.
          // so before sending the data to speech recognition, we need to amplify the data.
          // normally, to convert pcm (int16,[-32768,32767]) into float32, we divide the value by 32768 so
          // the value is between [-1,1]
          for (let i = 0; i < audio.length; i++) {
            audio[i] = audio[i] * 32768;
          }
          // test, show command analysis time
          const start = performance.now();
          const res = await recognizeCmd(
            {
              sampleRate: sampleRate,
              data: audio,
            },
            useLocal,
          );
          const end = performance.now();
          console.log("cost is", `${end - start}ms`);
          setAnaylizeTime(end - start);

          setCmdType(res.cmdType);
          setRecognizedText(res.text);
          // convert IE parameters to string
          let parameters = ` `;
          if (res.parameters) {
            Object.keys(res.parameters).forEach((key) => {
              parameters += `${key}:${
                res.parameters[key][0].text
              }, probability=${res.parameters[key][0].probability.toFixed(
                2,
              )}, `;
            });
          }

          setCmd(parameters);
          console.log(res);
          setStartCountWakeupTime(true);
          if (res.success && !res.ttsMessage) {
            setPlayAudioFile(audioFileMap.taskSuccess);
          }
          if (res.ttsMessage) {
            readText(res.ttsMessage);
          }
        }
      }
    },
  });
  const handleButtonClicked = () => {
    if (!isStart) {
      setIsStart(true);
      vad.start();
    } else {
      vad.pause();
      setWakeup(false);
      setIsStart(false);
      setRecognizedText("");
      setStatus("not speaking");
      setPlayAudioFile(undefined);
      setCmd("");
      setCmdType("");
      setAnaylizeTime(undefined);
    }
  };
  return (
    <>
      <Link style={{ margin: "32px" }} href="/home">
        Home
      </Link>
      <Layout>
        <Grid container direction="column" rowSpacing={2} paddingTop={4}>
          <TTS readText={readText} connectionStatus={connectionStatus}></TTS>
          <Grid item paddingBottom={2}>
            <Button onClick={handleButtonClicked} variant="contained">
              {isStart ? "Stop Recording" : "Start Recording"}
            </Button>
          </Grid>
          <Divider />
          <Grid item>
            <Typography variant="h5">{status}</Typography>
          </Grid>

          {type === FunctionOptions.CMD && (
            <>
              <Divider />
              <Grid item>
                <Typography variant="h5" color={wakeUp ? "green" : "red"}>
                  {wakeUp ? "已经唤醒" : "尚未唤醒"}
                </Typography>
              </Grid>
            </>
          )}
          <Divider />
          {analyzeTime && (
            <>
              <Grid item>
                <Typography variant="h5">{`解析时间:${analyzeTime} ms`}</Typography>
              </Grid>
              <Divider />
            </>
          )}
          {cmdType && (
            <>
              <Grid item>
                <Typography variant="h4">{`$指令类型:${cmdType}`}</Typography>
              </Grid>
              <Divider />
            </>
          )}
          <Divider />
          {recognizedText && (
            <>
              <Grid item>
                <Typography variant="h4">{recognizedText}</Typography>
              </Grid>
              <Divider />
            </>
          )}
          {cmd && (
            <>
              <Grid item>
                <Typography variant="h4">{cmd}</Typography>
              </Grid>
              <Divider />
            </>
          )}
        </Grid>
        {playAudioFile && (
          <ReactAudioPlayer
            src={playAudioFile}
            autoPlay
            controls={false} // set true to show the audio controls on the page
            onEnded={() => setPlayAudioFile(undefined)}
          />
        )}
        {recordedAudioFile && (
          <ReactAudioPlayer
            src={recordedAudioFile}
            autoPlay={false}
            controls // set true to show the audio controls on the page
          />
        )}
      </Layout>
    </>
  );
};

export default RecordingCmd;
