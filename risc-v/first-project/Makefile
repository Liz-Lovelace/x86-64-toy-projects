AS = riscv64-unknown-elf-as
LD = riscv64-unknown-elf-ld
OBJDUMP = riscv64-unknown-elf-objdump

ASFLAGS = -march=rv32i -mabi=ilp32
LDFLAGS = -m elf32lriscv -T link.ld

%.o: %.s
	$(AS) $(ASFLAGS) $< -o $@

%.elf: %.o
	$(LD) $(LDFLAGS) $< -o $@

run: start.elf
	qemu-system-riscv32 -machine virt -nographic -bios none -kernel start.elf

dump: start.elf
	$(OBJDUMP) -d start.elf

clean:
	rm -f *.o *.elf

.PHONY: run dump clean
