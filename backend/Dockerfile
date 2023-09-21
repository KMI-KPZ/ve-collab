FROM python:3.10-buster

WORKDIR /backend

COPY . .

RUN pip3 install -r requirements.txt

CMD [ "python3", "-u", "main.py" , "--create_admin=test_admin", "--supress_stdout_access_log", "--log-rotate-mode=size", "--log-file-prefix=log", "--log-file-num-backups=5"]