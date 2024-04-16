import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { PCMPlayer } from "./PcmPlayer";
import { base64ToBytes } from "./audio";

// import useAudioPlayer from "./useAudioPlayer";

const player = new PCMPlayer({
  encoding: "16bitInt",
  channels: 1,
  sampleRate: 24000,
  flushingTime: 10,
});

const useTTS = (url: string) => {
  const [messages, setMessages] = useState<MessageEvent<any>[]>([]);
  const { sendJsonMessage, readyState, getWebSocket } = useWebSocket(url, {
    shouldReconnect: () => true,
    reconnectInterval: 100,
    onClose: () => console.log("tts connection closed"),
    onOpen: () => console.log("tts connection opened"),
    onMessage: (e) => {
      console.log("tts message arrived", e);
      setMessages((x) => [...x, e]);
    },
  });
  // for some reason lastMessage is not set to null after reconnection

  const [ttsWords, setTTSWords] = useState("");
  const [ttsSession, setTTSSession] = useState("");
  const [lastPackage, setLastPackage] = useState(false);
  // const [audioList, setAudioList] = useState<string[]>([]);
  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];
  //const { addAudioBase64 } = useAudioPlayer();
  const readText = useCallback(
    async (words: string, ttsConnectionStatus: string = "Open") => {
      if (ttsConnectionStatus !== "Open") {
        console.log("tts disconnected");
        return;
      }
      setTTSWords(words);
      sendJsonMessage({ task: "tts", signal: "start" });
    },
    [sendJsonMessage],
  );

  useEffect(() => {
    if (messages.length === 0 || !ttsWords) {
      return;
    }
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || !msg.data) {
        continue;
      }
      console.log(msg);
      const data = JSON.parse(msg.data);
      if (data["signal"] === "server ready") {
        sendJsonMessage({ text: ttsWords, spk_id: 0 });
        setTTSSession(data["session"]);
      } else if (Object.keys(data).includes("audio")) {
        if (data["status"] === 2) {
          // last package
          setLastPackage(true);
        }
        // play audio here
        if (!data["audio"]) {
          // empty audio, normally it happens when it's the last package
          return;
        }
        const pcm_data = base64ToBytes(data["audio"]);
        player.feed(pcm_data);
        //await player.addData(data["audio"]);
        //  const dataArray = base64ToBytes(data["audio"]);
        //  const wf = new WaveFormate();
        //  wf.samplePerSec = 24000;
        //  wf.bitsPerSample = 2;
        //  wf.channels = 1;
        //  const dataWithWavHeader = addWavHeaders(dataArray, wf);
        //  const base64 = arrayBufferToBase64(dataWithWavHeader);
        //  setAudioList((x) => [...x, `data:audio/wav;base64,${base64}`]);
      } else if (data["signal"] === "connection will be closed") {
        // session is about to close, clear resources
        console.log("session is about to close, clear resources");
        setTTSSession("");
        setTTSWords("");
        setLastPackage(false);
        getWebSocket()?.close();
      }
      setMessages([]);
    }
  }, [ttsWords, sendJsonMessage, getWebSocket, messages]);

  useEffect(() => {
    if (lastPackage && ttsSession) {
      // tell server to close session
      console.log("tell server to close session");
      sendJsonMessage({
        task: "tts",
        signal: "end",
        session: ttsSession,
      });
    }
  }, [sendJsonMessage, ttsSession, lastPackage]);

  return { readText, connectionStatus };
};
export default useTTS;
