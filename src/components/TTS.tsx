import { Button, Divider, Grid, TextField, Typography } from "@mui/material";
import { useState } from "react";

interface TTSProps {
  readText: (words: string) => void;
  connectionStatus: string;
  audioList?: string[];
}
const TTS = ({ readText, connectionStatus }: TTSProps) => {
  const [ttsWords, setTTSWords] = useState("");
  return (
    <>
      <Grid item>
        <Typography variant="h5">{`TTS server:${connectionStatus}`}</Typography>
      </Grid>
      <Divider />
      <Grid item>
        <TextField
          id="outlined-multiline-flexible"
          label="请输入文字"
          multiline
          style={{ width: "100%" }}
          maxRows={40}
          value={ttsWords}
          onChange={(e) => setTTSWords(e.target.value)}
        />
      </Grid>
      <Grid item>
        <Button
          disabled={connectionStatus !== "Open" || !ttsWords}
          onClick={() => {
            readText(ttsWords);
          }}
          variant="contained"
        >
          试听
        </Button>
      </Grid>
      <Divider style={{ marginTop: "8px" }} />
    </>
  );
};

export default TTS;
