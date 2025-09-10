section .data
    msg dd 0xffffffff, 0xffff0000, 0xfff0ffff, 0xfff00000
    msg_len equ $ - msg

    sockaddr_un:
        dw 1   ; sun_family = AF_UNIX
        db "/tmp/graph-smooth-client-socket", 0
        times (108 - ($ - sockaddr_un - 2)) db 0  ; pad to 108 bytes


section .bss

section .text 
    global _start

_start:
    mov rax, msg
    mov rdi, msg_len
    ; call write_stdout


; pointer rax, length rdi
write_to_socket:
    ; --- socket(AF_UNIX, SOCK_STREAM, 0) ---
    mov rax, 41
    mov rdi, 1              ; AF_UNIX
    mov rsi, 1              ; SOCK_STREAM
    xor rdx, rdx
    syscall
    mov r12, rax            ; save fd

    ; --- connect(fd, &sockaddr_un, sizeof(sockaddr_un)) ---
    mov rax, 42
    mov rdi, r12
    lea rsi, [rel sockaddr_un]
    mov rdx, 110            ; 2 + 108
    syscall

    ; --- write(fd, nums, 4) ---
    mov rax, 1
    mov rdi, r12
    mov rsi, msg
    mov rdx, 4 * 4              ; sending 1 number (4 bytes)
    syscall

    ; --- close(fd) ---
    mov rax, 3
    mov rdi, r12
    syscall
    
    call exit

write_to_pipe:


; write syscall
; pointer rax, length rdi
write_stdout:
    mov rsi, rax
    mov rdx, rdi
    mov rax, 1
    mov rdi, 1
    syscall
    ret

; exit syscall
exit:
    mov rax, 60         ; sys_exit
    mov rdi, 0          ; exit status
    syscall
