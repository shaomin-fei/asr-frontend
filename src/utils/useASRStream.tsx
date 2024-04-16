import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const useASRStream = (url: string) => {
  const [messages, setMessages] = useState<MessageEvent<any>[]>([]);
  const [isServerReadyForASR, setIsServerReadyForASR] = useState(false);
  const [asrText, setASRText] = useState("");
  const [historyMessages, setHistoryMessages] = useState<string[]>([]);
  const { sendJsonMessage, readyState, sendMessage } = useWebSocket(url, {
    shouldReconnect: () => true,
    reconnectInterval: 100,
    onClose: () => console.log("asr server connection closed"),
    onOpen: () => console.log("asr server connection opened"),
    onMessage: (e) => {
      setMessages((x) => [...x, e]);
    },
  });
  const startASR = useCallback(() => {
    if (readyState !== ReadyState.OPEN) {
      return false;
    }
    sendJsonMessage({ signal: "start", nbest: 1, continuous_decoding: true });
  }, [sendJsonMessage, readyState]);
  const stopASR = useCallback(() => {
    setIsServerReadyForASR(false);
    setASRText("");
    setMessages([]);
    sendJsonMessage({ signal: "end" });
  }, [sendJsonMessage]);
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || !msg.data) {
        continue;
      }
      const data = JSON.parse(msg.data);
      if (data.type === "server_ready") {
        console.log("ASR server is ready");
        setIsServerReadyForASR(true);
      } else if (data.type == "partial_result") {
        const nbest = JSON.parse(data.nbest);
        const sentence = nbest[0].sentence;
        if (sentence.length > 0) {
          setASRText(sentence);
        }
      } else if (data.type == "final_result") {
        const nbest = JSON.parse(data.nbest);
        const sentence = nbest[0].sentence;
        if (sentence.length > 0) {
          setASRText("");
          setHistoryMessages((x) => {
            if (x.length >= 10) {
              return [sentence + "，"];
            } else {
              return [...x, sentence + "，"];
            }
          });
        }
        console.log(nbest);
      }
    }
    setMessages([]);
  }, [messages]);
  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];
  const msg = `${historyMessages.join("")}${asrText}`;
  return {
    startASR,
    connectionStatus,
    isServerReadyForASR,
    stopASR,
    sendMessage,
    asrMessage: msg,
  };
};
export default useASRStream;
