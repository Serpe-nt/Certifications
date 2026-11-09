#!/bin/bash

if [ "$EUID" -ne 0 ]; then
	echo "Please run the script with sudo!"
	exit 1
fi

if [ -z "$1" ]; then
	echo "Please specify new hostname!"
	exit 1
fi

echo "Changing the hostname..."
sed -i "s/$(hostname)/"$1"/g" /etc/hosts
hostnamectl set-hostname "$1"
echo "Done!"
echo ""

echo "Regenerating unique machine ID..."
rm /etc/machine-id
rm /var/lib/dbus/machine-id
systemd-machine-id-setup
ln -s /etc/machine-id /var/lib/dbus/machine-id
echo "Done!"
echo ""
echo "Generating new SSH keys..."
rm /etc/ssh/ssh_host_*
dpkg-reconfigure openssh-server
echo "Done!"
echo ""
echo "Re-seeding random source..."
systemctl stop systemd-random-seed
rm -f /var/lib/systemd/random-seed
systemctl start systemd-random-seed
echo "Done!"
echo ""
echo "Please reboot now!"
