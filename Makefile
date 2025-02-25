.PHONY: install build run docker

install:
	yarn install

build:
	yarn build

run:
	yarn start

docker:
	docker compose up --build
