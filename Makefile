all: docker-build docker-push
docker-build:
	docker build -t cristoferz/kmmwebsocket .
docker-push:
	docker push cristoferz/kmmwebsocket
docker-rebuild:
	./docker-container.sh rebuild
docker-reload:
	./docker-container.sh reload
docker-stop:
	./docker-container.sh stop
docker-start:
	./docker-container.sh start
docker-rm:
	./docker-container.sh rm
