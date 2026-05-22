#!/bin/bash

# Check if tracks directory exists
if [ ! -d "./tracks" ]; then
    echo "tracks/ not found. Are you sure your current working directory is midi-player-v2/ ?"
    exit 1
fi

# Convert MIDI files to .liztrack format
node midi-to-liz-format/convert_midi_files_to_liz_format.js

# Get all .liztrack files
tracks=(./tracks/*.liztrack)

# Check if any .liztrack files exist
if [ ${#tracks[@]} -eq 1 ] && [ ! -f "${tracks[0]}" ]; then
    echo "No .liztrack files found in tracks/ directory"
    exit 1
fi

# Function to display menu
display_menu() {
    local selected=$1
    clear
    echo "Select a track to play (use arrow keys, Enter to select, q to quit):"
    echo ""
    
    for i in "${!tracks[@]}"; do
        filename=$(basename "${tracks[$i]}")
        if [ $i -eq $selected ]; then
            echo "> $filename"
        else
            echo "  $filename"
        fi
    done
}

# Initialize
selected=0
total=${#tracks[@]}

# Main loop
while true; do
    display_menu $selected
    
    # Read single character
    read -rsn1 input
    
    case $input in
        $'\x1b')  # ESC sequence
            read -rsn2 input
            case $input in
                '[A')  # Up arrow
                    ((selected--))
                    if [ $selected -lt 0 ]; then
                        selected=$((total-1))
                    fi
                    ;;
                '[B')  # Down arrow
                    ((selected++))
                    if [ $selected -ge $total ]; then
                        selected=0
                    fi
                    ;;
            esac
            ;;
        '')  # Enter key
            # Copy selected track to track-to-play.liztrack
            cp "${tracks[$selected]}" "./track-to-play.liztrack"
            echo ""
            echo "Playing: $(basename "${tracks[$selected]}")"
            echo ""
            
            # Play the audio
            ./start.sh
            break
            ;;
        'q'|'Q')  # Quit
            echo ""
            echo "Exiting..."
            exit 0
            ;;
    esac
done

