# node_prereqs

Runs on every node:

- installs and enables chrony for time sync.

With `node_prereqs_longhorn: true` (the generated inventory sets it on workers), it also
prepares the node for Longhorn as described on <https://longhorn.io/docs/latest/deploy/install/>:

- packages `open-iscsi`, `nfs-common`, `cryptsetup`, `dmsetup`;
- kernel modules `iscsi_tcp` and `dm_crypt`, loaded now and at boot; `iscsid` enabled;
- a multipath blacklist for `sd*` devices, as a managed block in `/etc/multipath.conf`, when
  `multipath-tools` is installed;
- the data disk formatted as ext4 with label `longhorn` and mounted at `/var/lib/longhorn`.

The data disk is found the same way on any machine: it is the one whole disk with no
partition table and no filesystem, of `node_prereqs_data_disk_size_gb` (plus or minus 1 GB)
when that is above 0. A disk that already holds a filesystem or a partition table is never
formatted. Set `node_prereqs_data_disk_device` to skip the search. Once the filesystem labelled
`longhorn` exists, later runs only make sure it is mounted.
