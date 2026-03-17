.PHONY: help setup dev start test check typecheck clean clean-dev clean-all package package-mac make make-mac install uninstall reinstall open-data create-release deploy-release release

help:
	@echo "Robin - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make setup          - Check local prerequisites"
	@echo "  make dev            - Start Robin in development mode"
	@echo "  make test           - Run the current smoke gate (typecheck)"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make clean-dev      - Remove app data and stop Robin"
	@echo "  make clean-all      - Remove artifacts and local app data"
	@echo "  make install        - Package Robin.app and install it to /Applications"
	@echo "  make uninstall      - Remove Robin.app from /Applications"
	@echo "  make reinstall      - Uninstall then install again"
	@echo "  make open-data      - Open Robin's local user-data folder"
	@echo ""
	@echo "Packaging:"
	@echo "  make package        - Create an unpackaged mac build in out/"
	@echo "  make make           - Create distributable artifacts in out/make/"
	@echo "  make make-mac       - Same as make, explicitly for macOS"
	@echo ""
	@echo "Releasing:"
	@echo "  make create-release VERSION=0.1.0 - Bump version, build, sign, notarize, tag locally"
	@echo "  make deploy-release VERSION=0.1.0 - Push tag and upload artifacts to GitHub Releases"
	@echo "  make release VERSION=0.1.0        - Prepare and publish in one go"
	@echo ""
	@echo "Docs:"
	@echo "  See RELEASING.md for signing and release env vars"

setup:
	@./scripts/npmw run setup

dev:
	@./scripts/npmw run dev

start:
	@./scripts/npmw run start

typecheck:
	@./scripts/npmw run typecheck

check:
	@./scripts/npmw run check

test:
	@./scripts/npmw run test

clean:
	@./scripts/npmw run clean

clean-dev:
	@./scripts/npmw run clean:app

clean-all:
	@./scripts/npmw run clean:all

package:
	@./scripts/npmw run package:mac

package-mac:
	@./scripts/npmw run package:mac

make:
	@./scripts/npmw run make:mac

make-mac:
	@./scripts/npmw run make:mac

install:
	@./scripts/npmw run install:mac

uninstall:
	@./scripts/npmw run uninstall:mac

reinstall:
	@make uninstall
	@make install

open-data:
	@./scripts/npmw run open:user-data

create-release:
	@VERSION=$(VERSION) ./scripts/npmw run release:prepare

deploy-release:
	@VERSION=$(VERSION) ./scripts/npmw run release:publish

release:
	@VERSION=$(VERSION) ./scripts/npmw run release
