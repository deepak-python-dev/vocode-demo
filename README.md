# VOCODE AI
This Repo helps to setup a Vocode AI agent at local system where we can interact with AI Bot

## Features
- Can interact(Talk) with AI Bot 
- Initial Message of Bot is dynamically linked i.e fetched from database and can be updated as required
- Backend is developed using Python Fastapi
- Frontend is developed using React

## Environments
Make **.env** file at root level and fill in the values of your API keys. You’ll need to get API keys for:
- DEEPGRAM_API_KEY=
- OPENAI_API_KEY=
- AZURE_SPEECH_KEY=
- AZURE_SPEECH_REGION=
- REACT_APP_VOCODE_BACKEND_URL= #url of backend server code e.g http://localhost:8000
- WDS_SOCKET_PORT=0

Database Configuration
- DB_HOST=# Database Host
- DB_USERNAME=# Database user
- DB_PASSWORD= #Database Password
- DB_DATABASE=#Database Name

## Steps

## Running the server
Pick one of these two ways to run the server: 1. Run everything with Docker, 2. Run Python directly

####  Run everything With Docker
Build and run the telephony app Docker image. From the root directory, run:
```sh 
docker-compose up --build 
```
You can access the frontend code at [http://localhost:3000](http://localhost:3000) (if no default settings are changed)    


for more reference,Check official documentation of [Vocode](https://docs.vocode.dev/)









