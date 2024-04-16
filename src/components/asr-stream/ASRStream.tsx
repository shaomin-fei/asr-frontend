import { Button, Divider, Grid, Link, Typography } from "@mui/material";
import { useLocation } from "react-router";
import { FunctionOptions, ms_each_frame } from "../asr-cmd/RecordingCmd";
import Layout from "../Layout";
import { useMicVAD } from "@ricky0123/vad-react";
import { useState } from "react";
import useASRStream from "../../utils/useASRStream";

const sampleRate = 16000;
const ASRStream = () => {
  const [status, setStatus] = useState("not speaking");
  const [isStart, setIsStart] = useState(false);
  const { endAfterMs, useLocal } = useLocation().state as {
    type: FunctionOptions;
    endAfterMs: number;
    useLocal: boolean;
  };

  const asrUrl = useLocal
    ? process.env.REACT_APP_ASR_STREAM_LOCAL
    : process.env.REACT_APP_ASR_STREAM_PUBLIC;

  const {
    connectionStatus,
    isServerReadyForASR,
    startASR,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stopASR,
    sendMessage,
    asrMessage,
  } = useASRStream(asrUrl || "");
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
    },
    onVADMisfire: async () => {
      setStatus("not speaking");
    },
    onSpeechEnd: async (audio: Float32Array) => {
      setStatus("not speaking");
      const audio16 = new Int16Array(audio.length);
      for (let i = 0; i < audio.length; i++) {
        audio16[i] = Math.round(audio[i] * 32768);
      }
      sendMessage(audio16.buffer);
    },
  });

  const handleButtonClicked = () => {
    if (!isStart) {
      setIsStart(true);
      // Give asr server a start signal
      startASR();

      vad.start();
    } else {
      vad.pause();
      // Tell the asr server to stop
      stopASR();

      setIsStart(false);
      setStatus("not speaking");
    }
  };
  return (
    <>
      <Link style={{ margin: "32px" }} href="/home">
        Home
      </Link>
      <Layout>
        {" "}
        <Grid container direction="column" rowSpacing={2} paddingTop={4}>
          <Grid item>
            <Typography variant="h5">{`ASR server:${connectionStatus}${
              isServerReadyForASR && " Ready for ASR"
            }`}</Typography>
          </Grid>
          <Grid item paddingBottom={2}>
            <Button onClick={handleButtonClicked} variant="contained">
              {isStart ? "Stop Recording" : "Start Recording"}
            </Button>
          </Grid>
          <Grid item>
            <Typography variant="h5">{status}</Typography>
          </Grid>
          <Divider />
          <Grid item>
            <Typography variant="h5">{asrMessage}</Typography>
          </Grid>
        </Grid>
      </Layout>
    </>
  );
};
export default ASRStream;
