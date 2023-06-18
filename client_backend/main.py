import logging
from fastapi import FastAPI

from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.synthesizer import AzureSynthesizerConfig, ElevenLabsSynthesizerConfig
from vocode.streaming.synthesizer.azure_synthesizer import AzureSynthesizer
from vocode.streaming.synthesizer.eleven_labs_synthesizer import ElevenLabsSynthesizer


from vocode.streaming.agent.chat_gpt_agent import ChatGPTAgent
from vocode.streaming.client_backend.conversation import ConversationRouter
from vocode.streaming.models.message import BaseMessage

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(docs_url=None)

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

conversation_router = ConversationRouter(
    agent=ChatGPTAgent(
        ChatGPTAgentConfig(
            initial_message=BaseMessage(text="Hello!"),
            prompt_preamble="Have a pleasant conversation about life",
        )
    ),
    synthesizer_thunk=lambda output_audio_config: ElevenLabsSynthesizer(
        ElevenLabsSynthesizerConfig.from_output_audio_config(
            output_audio_config, voice_id="pNInz6obpgDQGcFmaJgB"
        )
    ),
    logger=logger,
)

app.include_router(conversation_router.get_router())
