import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { PCMPlayer } from "./PcmPlayer";
import { base64ToBytes } from "./audio";

// import useAudioPlayer from "./useAudioPlayer";

const initPlayer = new PCMPlayer({
  encoding: "16bitInt",
  channels: 1,
  sampleRate: 24000,
  flushingTime: 10,
});

const useTTS = (url: string) => {
  const [messages, setMessages] = useState<MessageEvent<any>[]>([]);
  const [isReading, setIsReading] = useState(false);
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
  const [player] = useState(initPlayer);
  const [counter, setCounter] = useState(-1);
  // const [audioList, setAudioList] = useState<string[]>([]);
  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  console.log(`render counter=${counter}`);
  const ttsReadEnd = () => {
    setIsReading(() => {
      return false;
    });
    setCounter((x) => x + 1);
  };

  // we have to give player.onEnd a new value every time it's re-rendered, otherwise
  // the staled information will be used in the callback, which causes a lot of unexpected problem

  //  if (!player.onEnd) {
  //    player.onEnd = ttsReadEnd;
  //  }
  player.onEnd = ttsReadEnd;
  //console.log(`useTTS isReading=${isReading}`);
  //const { addAudioBase64 } = useAudioPlayer();
  const readText = useCallback(
    async (words: string, ttsConnectionStatus: string = "Open") => {
      if (ttsConnectionStatus !== "Open") {
        console.log("tts disconnected");
        return;
      }
      setCounter((x) => x + 1);
      player.streamFinished = false;
      setIsReading(true);
      setTTSWords(words);
      sendJsonMessage({ task: "tts", signal: "start" });
    },
    [sendJsonMessage, player],
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
          continue;
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
        player.streamFinished = true;
        // we need to feed some silent data to ensure the onEnd will be triggered
        // the reason is, when we detect if it's necessary to add listener to onend event,
        // it's possible that it happens before streamFinished is set to true.
        const silentData = new Uint8Array(512);
        player.feed(silentData);
      }
      setMessages([]);
    }
  }, [ttsWords, sendJsonMessage, getWebSocket, messages, player]);

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

  return { readText, connectionStatus, isReading };
};
export default useTTS;
