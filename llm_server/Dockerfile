FROM ollama/ollama

COPY ./run_ollama.sh /tmp/run_ollama.sh

WORKDIR /tmp

RUN chmod +x run_ollama.sh \
    && ./run_ollama.sh

EXPOSE 11434