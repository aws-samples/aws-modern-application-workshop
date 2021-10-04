FROM mcr.microsoft.com/dotnet/sdk:2.1 as build
WORKDIR /app
COPY . /app
RUN dotnet publish -c Release -r linux-musl-x64 -o out

FROM mcr.microsoft.com/dotnet/runtime:2.1-alpine
WORKDIR /app
COPY --from=build /app/out ./
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080/tcp
ENTRYPOINT [ "./ModernWebAppNET" ]
