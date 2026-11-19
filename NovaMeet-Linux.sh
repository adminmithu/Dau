#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
google-chrome --app="file://$DIR/index.html" 2>/dev/null || xdg-open "file://$DIR/index.html"
