import { useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const connectionStatus = {
  [ReadyState.CONNECTING]: "Connecting",
  [ReadyState.OPEN]: "Open",
  [ReadyState.CLOSING]: "Closing",
  [ReadyState.CLOSED]: "Closed",
  [ReadyState.UNINSTANTIATED]: "Uninstantiated",
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStreamAudioRecognize = (serverUrl: string) => {
  const { sendMessage, lastMessage, readyState } = useWebSocket(serverUrl, {
    onOpen: () => console.log("opened"),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shouldReconnect: (closeEvent) => true,
  });
  const dataArrive = useCallback(
    async (data: Float32Array) => {
      await sendMessage(data);
    },
    [sendMessage],
  );
  return {
    dataArrive,
    lastMessage,
    status: connectionStatus[readyState],
  };
};

export default useStreamAudioRecognize;
