FROM python:2.7-slim
RUN echo Copying the Mythical Mysfits Flask service into a service directory.
COPY ./service /MythicalMysfitsService
WORKDIR /MythicalMysfitsService
RUN echo Installing Python packages listed in requirements.txt
RUN pip install --trusted-host pypi.pyhton.org -r ./requirements.txt
RUN echo Starting python and starting the Flask service...
ENTRYPOINT ["python"]
CMD ["mythicalMysfitsService.py"]
