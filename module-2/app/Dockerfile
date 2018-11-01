FROM ubuntu:latest
RUN echo Updating existing packages, installing and upgrading pip and Go.
RUN apt-get update -y
RUN apt-get install -y golang-go
RUN pip install --upgrade pip
RUN echo Copying the Mythical Mysfits Go service into a service directory.
COPY ./service /MythicalMysfitsService
WORKDIR /MythicalMysfitsService
RUN echo Installing Go packages listed in requirements.txt
RUN pip install -r ./requirements.txt
RUN echo Starting the Go service...
ENTRYPOINT ["go"]
CMD ["go run mythicalMysfitsService.go"]
