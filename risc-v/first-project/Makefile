AS = riscv64-unknown-elf-as
LD = riscv64-unknown-elf-ld
OBJDUMP = riscv64-unknown-elf-objdump

ASFLAGS = -march=rv32i -mabi=ilp32
LDFLAGS = -m elf32lriscv -T src/link.ld

SRC = src/start.s
OBJ = build/start.o
ELF = build/start.elf

all: $(ELF)

$(OBJ): $(SRC) | build
	$(AS) $(ASFLAGS) $< -o $@

$(ELF): $(OBJ)
	$(LD) $(LDFLAGS) $< -o $@

build:
	mkdir -p build

run: $(ELF)
	qemu-system-riscv32 -machine virt -nographic -bios none -kernel $(ELF)

dump: $(ELF)
	$(OBJDUMP) -d $(ELF)

clean:
	rm -rf build

.PHONY: all run dump clean
