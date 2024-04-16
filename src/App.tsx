import React, { useState } from "react";
import "./App.css";
import Layout from "./components/Layout";
import {
  FunctionOptions,
  ms_each_frame,
} from "./components/asr-cmd/RecordingCmd";
import * as ort from "onnxruntime-web";
import { styled } from "@mui/material/styles";

import { useNavigate } from "react-router";
import {
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
  Checkbox,
} from "@mui/material";

ort.env.wasm.numThreads = 8;
ort.env.wasm.wasmPaths = {
  "ort-wasm-simd-threaded.wasm": `${process.env.REACT_APP_PUBLIC_URL}/static/js/ort-wasm-simd-threaded.wasm`,
  "ort-wasm-simd.wasm": `${process.env.REACT_APP_PUBLIC_URL}/static/js/ort-wasm-simd.wasm`,
  "ort-wasm.wasm": `${process.env.REACT_APP_PUBLIC_URL}/static/js/ort-wasm.wasm`,
  "ort-wasm-threaded.wasm": `${process.env.REACT_APP_PUBLIC_URL}/static/js/ort-wasm-threaded.wasm`,
};

const RecordContainer = styled("div")({
  width: "100%",
});

const default_cmd_end_after = 15;
const default_asr_end_after = 2;

function App() {
  const [model, setModel] = useState<FunctionOptions>(FunctionOptions.CMD);
  const [endAfterMs, setEndAfterMs] = useState(
    default_cmd_end_after * ms_each_frame,
  );
  const [isStart, setIsStart] = useState(false);
  const [useLocal, setUseLocal] = useState(true);
  // eslint-disable-next-line no-undef
  //const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const navigate = useNavigate();
  //  const utterance = new SpeechSynthesisUtterance(
  //    "简单测试一下中文的效果，看看好不好",
  //  );
  //  const synth = window.speechSynthesis;
  //  synth.addEventListener("voiceschanged", () => {
  //    const voices = synth.getVoices();
  //    console.log(`voices=${voices}`);
  //    setVoice(
  //      voices.filter(
  //        (x) => x.name.includes("普通话") || x.name.includes("Chinese"),
  //      )[0],
  //    );
  //  });

  const handleButtonClicked = async () => {
    if (!isStart) {
      setIsStart(true);

      let path = "/asr";
      if (model === FunctionOptions.CMD) {
        path = "/cmd";
      }
      navigate(path, {
        state: {
          type: model,
          endAfterMs: endAfterMs,
          useLocal: useLocal,
        },
      });
    } else {
      setIsStart(false);
    }
  };
  // web api tts works for edge and firefox under both online/offline mode, but not for chrome
  // chrom can't play it without user's interaction. That means we need a button to trigger the speak process

  //  useEffect(() => {
  //    if (voice) {
  //      const utterance = new SpeechSynthesisUtterance(
  //        "简单测试一下中文的效果，看看好不好",
  //      );
  //      utterance.voice = voice;
  //      synth.cancel();
  //      utterance.rate = 1;
  //      synth.speak(utterance);
  //    }
  //  }, [voice, synth]);
  return (
    <>
      <Layout>
        <RecordContainer>
          <Grid item>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useLocal}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setUseLocal(event.target.checked);
                  }}
                />
              }
              label="使用本地服务"
            />
          </Grid>
          <Grid item>
            <RadioGroup
              name="Model"
              value={model.toString()}
              row
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const val = (
                  event.target as HTMLInputElement
                ).value.toString() as FunctionOptions;
                setModel(val);
                if (val === FunctionOptions.CMD) {
                  setEndAfterMs(default_cmd_end_after * ms_each_frame);
                } else {
                  setEndAfterMs(default_asr_end_after * ms_each_frame);
                }
              }}
            >
              {["CMD", "ASR"].map((value) => (
                <FormControlLabel
                  key={value}
                  value={value.toString()}
                  control={<Radio />}
                  label={value.toString()}
                />
              ))}
            </RadioGroup>
          </Grid>
          <Divider />
          <Grid padding={2} item>
            <Grid container columnGap={3}>
              <Button onClick={handleButtonClicked} variant="contained">
                {isStart ? "Stop" : "Start"}
              </Button>
              <TextField
                label="End After (ms)"
                id="end-after"
                value={endAfterMs}
                type="number"
                variant="standard"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setEndAfterMs(parseInt(event.target.value));
                }}
              />
            </Grid>

            <></>
          </Grid>

          <Divider />
        </RecordContainer>
      </Layout>
    </>
  );
}

export default App;
