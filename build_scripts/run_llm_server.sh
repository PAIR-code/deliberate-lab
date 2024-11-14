# run a small CPU version of llama 3.2
# make sure the docker daemon is running

docker start ollama
docker exec -d ollama internal_run_ollama.sh 
