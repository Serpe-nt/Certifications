#!/usr/bin/bash

inventory=(loadBalancer master1 master2 master3 worker1 worker2 worker3 worker4)

if [ -z "$1" ]; then
  echo "Please specify state argument 'start' or 'shutdown'"
  exit 1
fi

# Validate input
case "$1" in
start | shutdown) ;;
*)
  echo "Invalid argument passed!"
  echo "Valid args: 'start' | 'shutdown'"
  exit 1
  ;;
esac

echo "$1"

# Manage cluster state
if [ "$1" == start ]; then
  for i in "${inventory[@]}"; do
    virsh start "$i"
    sleep 2
  done
fi

if [ "$1" == shutdown ]; then
  for ((i = ${#inventory[@]} - 1; i >= 0; i--)); do
    virsh shutdown "$i"
    sleep 2
  done
fi
