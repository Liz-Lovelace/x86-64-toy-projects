.section .text
.global _start

_start:
    # QEMU's virt machine has UART at 0x10000000
    li   t0, 0x10000000    # Load UART address
    
    # Write "Hello!\n" one character at a time
    li   t1, 'H'
    sb   t1, 0(t0)
    
    li   t1, 'e'
    sb   t1, 0(t0)
    
    li   t1, 'l'
    sb   t1, 0(t0)
    
    li   t1, 'l'
    sb   t1, 0(t0)
    
    li   t1, 'o'
    sb   t1, 0(t0)
    
    li   t1, '!'
    sb   t1, 0(t0)
    
    li   t1, '\n'
    sb   t1, 0(t0)
    
    # Infinite loop (hang)
halt:
    j halt
