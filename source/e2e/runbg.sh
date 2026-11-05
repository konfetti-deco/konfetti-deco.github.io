#!/bin/bash
cd /home/claude/fz; out=tmp/runlog; mkdir -p $out
for f in "$@"; do b=$(basename $f .js); NODE_PATH=/opt/npm-tools/node_modules timeout 400 node $f > $out/$b.log 2>&1; echo "EXIT $?" >> $out/$b.log; done
