FROM python:3.10-buster

WORKDIR /sse-platform

COPY . .

RUN pip3 install -r requirements.txt

EXPOSE 8903

CMD [ "python3", "-u", "main.py" , "--no_wiki"]