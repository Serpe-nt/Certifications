# The workshop service, or one of its solutions, in a container.
#   docker compose up --build                                   the service as the lessons start it
#   WORKSHOP_VARIANT=solutions/03-propagation docker compose up --build
# VARIANT picks the folder whose requirements are installed and whose
# workshop.env names the start command (see run.py).
FROM python:3.14.10-slim-trixie@sha256:9aaa474097d094040649f2162a627c0049b408f52138d980916788d80f04802f
ARG VARIANT=.
ENV WORKSHOP_VARIANT=${VARIANT} \
    WORKSHOP_HOST=0.0.0.0 \
    WORKSHOP_PORT=8000 \
    WORKSHOP_DB=/tmp/workshop.db \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /workshop
COPY . .
RUN pip install --no-cache-dir -r "${VARIANT}/requirements.txt"
USER 65532:65532
EXPOSE 8000
CMD ["sh", "-c", "exec python run.py --no-venv \"$WORKSHOP_VARIANT\""]
