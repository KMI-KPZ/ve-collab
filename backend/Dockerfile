FROM python:3.10-buster

WORKDIR /backend

COPY . .

RUN pip3 install -r requirements.txt

EXPOSE 8903

CMD [ "python3", "-u", "main.py" , "--create_admin=test_admin"]