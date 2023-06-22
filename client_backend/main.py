import logging
from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()
from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.synthesizer import ElevenLabsSynthesizerConfig
from vocode.streaming.synthesizer.eleven_labs_synthesizer import ElevenLabsSynthesizer

from vocode.streaming.agent.chat_gpt_agent import ChatGPTAgent
from vocode.streaming.client_backend.conversation import ConversationRouter
from vocode.streaming.models.message import BaseMessage

import logging
import typing

from fastapi import WebSocket
from vocode.streaming.models.websocket import (
    AudioConfigStartMessage,
    AudioMessage,
    ReadyMessage,
    WebSocketMessage,
    WebSocketMessageType,
)

from vocode.streaming.output_device.websocket_output_device import WebsocketOutputDevice
from vocode.streaming.streaming_conversation import StreamingConversation

from dotenv import load_dotenv

from db_connector import TbMessage

load_dotenv()

app = FastAPI(docs_url=None)

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class CustomConversationRouter(ConversationRouter):
    DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"

    def get_conversation(self, output_device: WebsocketOutputDevice, start_message: AudioConfigStartMessage,
                         raw_message: typing.Any) -> StreamingConversation:
        transcriber = self.transcriber_thunk(start_message.input_audio_config)
        synthesizer = self.synthesizer_thunk(start_message.output_audio_config)
        synthesizer.synthesizer_config.should_encode_as_wav = True
        # voice_id = raw_message.get("synthesizer_config",{}).get("voice_id")
        # if voice_id:
        #     synthesizer.voice_id=voice_id
        return StreamingConversation(
            output_device=output_device,
            transcriber=transcriber,
            agent=self.agent,
            synthesizer=synthesizer,
            conversation_id=start_message.conversation_id,
            logger=self.logger,
        )

    async def conversation(self, websocket: WebSocket):
        await websocket.accept()
        message = await websocket.receive_json()
        start_message: AudioConfigStartMessage = AudioConfigStartMessage.parse_obj(
            message
        )
        self.logger.debug(f"Conversation started")
        output_device = WebsocketOutputDevice(
            websocket,
            start_message.output_audio_config.sampling_rate,
            start_message.output_audio_config.audio_encoding,
        )
        conversation = self.get_conversation(output_device, start_message, message)
        await conversation.start(lambda: websocket.send_text(ReadyMessage().json()))
        while conversation.is_active():
            message: WebSocketMessage = WebSocketMessage.parse_obj(
                await websocket.receive_json()
            )
            if message.type == WebSocketMessageType.STOP:
                break
            audio_message = typing.cast(AudioMessage, message)
            conversation.receive_audio(audio_message.get_bytes())
        output_device.mark_closed()
        conversation.terminate()


print(os.getenv("DB_HOST"), "host")
print(os.getenv("DB_USERNAME"), "DB_USERNAME")
print(os.getenv("DB_PASSWORD"), "DB_PASSWORD")
print(os.getenv("DB_DATABASE"), "DB_DATABASE")

db = TbMessage(host=os.getenv("DB_HOST"),
               user=os.getenv("DB_USERNAME"),
               password=os.getenv("DB_PASSWORD"),
               database=os.getenv("DB_DATABASE"))
db.connect()
print(db.connect() ,"db.connect()")
active_message_row = db.fetch_result()
active_message_row = active_message_row[0]

conversation_router = CustomConversationRouter(
    agent=ChatGPTAgent(
        ChatGPTAgentConfig(
            initial_message=BaseMessage(text=f"{active_message_row['message']}"),
            prompt_preamble="Have a pleasant conversation about life",
        )
    ),
    logger=logger,
)
db.disconnect()
app.include_router(conversation_router.get_router(), prefix="/api")
