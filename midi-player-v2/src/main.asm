section .data
    filename               db 'input.txt', 0
    bonkchar               db '?', 0
    notes_adder_lookup     dw 0xc,0xd,0xe,0xe,0xf,0x10,0x11,0x12,0x13,0x14,0x16,0x17,0x18,0x1a,0x1b,0x1d,0x1f,0x20,0x22,0x24,0x27,0x29,0x2b,0x2e,0x31,0x33,0x37,0x3a,0x3d,0x41,0x45,0x49,0x4d,0x52,0x57,0x5c,0x61,0x67,0x6d,0x74,0x7a,0x82,0x89,0x92,0x9a,0xa3,0xad,0xb7,0xc2,0xce,0xda,0xe7,0xf5,0x103,0x113,0x123,0x135,0x147,0x15a,0x16f,0x185,0x19c,0x1b4,0x1ce,0x1ea,0x207,0x226,0x247,0x269,0x28e,0x2b5,0x2de,0x30a,0x338,0x369,0x39d,0x3d4,0x40e,0x44c,0x48d,0x4d2,0x51c,0x56a,0x5bc,0x613,0x670,0x6d2,0x739,0x7a7,0x81c,0x897,0x91a,0x9a5,0xa37,0xad3,0xb78,0xc26,0xcdf,0xda3,0xe73,0xf4f,0x1038,0x112f,0x1234,0x1349,0x146f,0x15a6,0x16f0,0x184d,0x19bf,0x1b47,0x1ce6,0x1e9e,0x2070,0x225d,0x2469,0x2693,0x28de,0x2b4c,0x2ddf,0x3099,0x337d,0x368d,0x39cb,0x3d3b,0x40df,0x44bb
    notes_waveform_state   times 128 dw 0x0000
    notes_is_playing       times 128 db 0x00

section .bss
    raw_track     resb 1024
    fd            resd 1
    soundword     resw 1


section .text
    global _start

_start:
    mov word [soundword], 0
    ; read file
    mov rax, 2          ; sys_open
    mov rdi, filename
    mov rsi, 0          ; r
    ; mov rdx, 0644o      ; permissions (don't need for open)
    syscall

    mov [fd], eax       ; Save the file descriptor

    mov rax, 0           ; sys_read
    mov rdi, [fd]        ; give it the file descriptor
    mov rsi, raw_track   ; where to write it
    mov rdx, 1024           ; how many bytes to take
    syscall

    mov rax, 3          ; sys_close
    mov rdi, [fd]       ; file descriptor
    syscall


    ; mov byte [notes_is_playing + 0x03], 0xff
    ; call update_all_notes_wave_state
    ; call sum_all_notes
    ; mov word [soundword], ax
    ; call write_sample_to_stdout
    ; jmp exit

    mov r10, 0
    .play_track_loop:
        mov dl, [raw_track + r10] ; load note number

        cmp dl, 0xA ; if current note number is \LF
        je exit     ; then quit

        ; call determine_soundword_adder_from_letter
        ; mov r8w, ax ; write adder const to r8w

        mov byte [notes_is_playing + 0x3C], 0xff

        mov r11, 0
        .play_for_a_bit:
            call update_all_notes_wave_state
            call sum_all_notes
            mov word [soundword], ax
            call write_sample_to_stdout
            inc r11
            cmp r11, 10000
            jne .play_for_a_bit

        ; call play_sound_from_accumulator
        inc r10
        jmp .play_track_loop


; goes through all the notes and, if the note is turned on, adds the adder number to each note waveform state 
update_all_notes_wave_state:
    mov rcx, 0
.loop:
    cmp byte [notes_is_playing + rcx], 0x00      ; if note is off
    je .continue                                 ; then continue

    ; add the adder number to the waveform state
    mov ax, [notes_adder_lookup + rcx * 2]   
    ; mov ax, 0x41
    add word [notes_waveform_state + rcx * 2], ax

.continue:
    inc rcx
    cmp rcx, 128
    jne .loop
    ret


sum_all_notes: 
    mov rcx, 0
    mov ax, 0
.loop:
    cmp byte [notes_is_playing + rcx], 0x00      ; if note is off
    je .continue                                 ; then continue

    ; add the current waveform state of the note to an accumulator
    add word ax, [notes_waveform_state + rcx * 2]   

.continue:
    inc rcx
    cmp rcx, 128
    jne .loop

    ret


write_sample_to_stdout:
    ; write system call
    mov rax, 1          ; sys_write
    mov rdi, 1          ; stdout
    mov rsi, soundword  ; pointer to what to write
    mov rdx, 2          ; message length
    syscall             
    ret

exit:
    ; exit system call
    mov rax, 60         ; sys_exit
    mov rdi, 0          ; exit status
    syscall

bonk:
    ; write system call
    mov rax, 1          ; sys_write
    mov rdi, 1          ; stdout
    mov rsi, bonkchar   ; pointer to what to write
    mov rdx, 1          ; message length
    syscall             
    ret
