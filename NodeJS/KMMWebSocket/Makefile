docker-build:
	docker build -t kmm/kmmwebsocket .
docker-tag:
	docker tag kmm/kmmwebsocket 303039355160.dkr.ecr.sa-east-1.amazonaws.com/kmmwebsocket
docker-login:
	aws ecr get-login --no-include-email --region sa-east-1
docker-push: docker-tag docker-login
	docker push 303039355160.dkr.ecr.sa-east-1.amazonaws.com/kmmwebsocket
docker-deploy:
	aws ecs update-service --cluster cluster-kmm --service service-kmmwebsocket --force-new-deployment
