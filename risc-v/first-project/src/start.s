.section .text
.global _start

_start:
    # QEMU's virt machine has UART at 0x10000000
    li  t6, 0x10000000    # Load UART address
    li  t1, '\n'
    sb  t1, 0(t6)

    li a0, 1234
    call print_integer

    li a0, 120
    call print_integer
    
halt:
    wfi
    j halt

# input (unmodified) a0: non-negative integer
# output: none, but will print the number to console with a newline
print_integer:
    # t1 is inp on each iteration
    # t2 is result address
    # t3 is division counter (next iter result)
    # t4 is const 9
    mv t1, a0
    li  t2, 0x80001000
    li  t3, 0
    li  t4, 9
.division_loop:
    ble t1, t4, .division_done
    addi t1, t1, -10
    addi t3, t3, 1
    # bgt t1, t4, division_loop
    j .division_loop
.division_done:

    sb t1, 0(t2)
    addi t2, t2, 1
    mv t1, t3
    li t3, 0
    bgt t1, t4, .division_loop
    sb t1, 0(t2)
    bne t1, zero, .skip_last_char
    addi t2, t2, -1
.skip_last_char:

    li  t4, 0x80001000-1
.output_loop:
    lb  t1, 0(t2)
    addi t1, t1, 48
    sb  t1, 0(t6)
    addi t2, t2, -1
    bne t4, t2, .output_loop

    li  t1, '\n'
    sb  t1, 0(t6)
    ret
