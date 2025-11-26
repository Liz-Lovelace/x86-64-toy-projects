section .data
    filename db 'input.txt', 0

section .bss
    raw_track     resb 1024
    fd            resd 1
    soundbyte     resb 1

section .text
    global _start

_start:
    mov byte [soundbyte], 0
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


    mov r10, 0
    .play_track_loop:
        mov dl, [raw_track + r10]
        cmp dl, 0xA ; if current note is \LF
        je exit ; then jump to exit
        call determine_soundbyte_adder_from_letter
        mov r8b, al ; returned adder
        call play_sound_from_accumulator
        inc r10
        jmp .play_track_loop


play_sound_from_accumulator:
    mov r9, 0
    .loop:
        add byte [soundbyte], r8b

        ; write system call
        mov rax, 1          ; sys_write
        mov rdi, 1          ; stdout
        mov rsi, soundbyte  ; what to write
        mov rdx, 1          ; message length
        syscall             

        inc r9
        cmp r9, 300
        jne .loop
        ret

; how much we add each iteration is derived with a formula:
; (raw_track to add) = (desired hz) / (sample rate) * 256
determine_soundbyte_adder_from_letter:
        mov al, 3 ; default value

        cmp dl, 'C'
        jne .skip_note_C
        mov al, 33
    .skip_note_C:
        cmp dl, 'c'
        jne .skip_note_c
        mov al, 35
    .skip_note_c:
        cmp dl, 'D'
        jne .skip_note_D
        mov al, 38
    .skip_note_D:
        cmp dl, 'd'
        jne .skip_note_d
        mov al, 40
    .skip_note_d:
        cmp dl, 'E'
        jne .skip_note_E
        mov al, 42
    .skip_note_E:
        cmp dl, 'F'
        jne .skip_note_F
        mov al, 45
    .skip_note_F:
        cmp dl, 'f'
        jne .skip_note_f
        mov al, 48
    .skip_note_f:
        cmp dl, 'G'
        jne .skip_note_G
        mov al, 50
    .skip_note_G:
        cmp dl, 'g'
        jne .skip_note_g
        mov al, 53
    .skip_note_g:
        cmp dl, 'A'
        jne .skip_note_A
        mov al, 56
    .skip_note_A:
        cmp dl, 'a'
        jne .skip_note_a
        mov al, 60
    .skip_note_a:
        cmp dl, 'B'
        jne .skip_note_B
        mov al, 63
    .skip_note_B:
        cmp dl, ' '
        jne .skip_note_silent
        mov al, 0
    .skip_note_silent:
        ret 


exit:
    ; exit system call
    mov rax, 60         ; sys_exit
    mov rdi, 0          ; exit status
    syscall

