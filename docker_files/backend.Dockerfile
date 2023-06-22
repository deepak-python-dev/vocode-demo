FROM ubuntu:20.04
ENV DEBIAN_FRONTEND noninteractive
# get portaudio and ffmpeg
RUN apt-get update \
        && apt-get install libportaudio2 libportaudiocpp0 portaudio19-dev libasound-dev libsndfile1-dev ffmpeg build-essential libssl-dev ca-certificates libasound2 wget python3-pip  python3-dev default-libmysqlclient-dev build-essential -y

WORKDIR /app
COPY ./client_backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt
RUN pip install --upgrade azure-cognitiveservices-speech
COPY ./client_backend/db_connector.py /app/db_connector.py
COPY ./client_backend/main.py /app/main.py
