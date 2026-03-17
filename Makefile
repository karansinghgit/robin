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
	@npm run setup

dev:
	@npm run dev

start:
	@npm run start

typecheck:
	@npm run typecheck

check:
	@npm run check

test:
	@npm run test

clean:
	@npm run clean

clean-dev:
	@npm run clean:app

clean-all:
	@npm run clean:all

package:
	@npm run package:mac

package-mac:
	@npm run package:mac

make:
	@npm run make:mac

make-mac:
	@npm run make:mac

install:
	@npm run install:mac

uninstall:
	@npm run uninstall:mac

reinstall:
	@make uninstall
	@make install

open-data:
	@npm run open:user-data

create-release:
	@VERSION=$(VERSION) npm run release:prepare

deploy-release:
	@VERSION=$(VERSION) npm run release:publish

release:
	@VERSION=$(VERSION) npm run release
