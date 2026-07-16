import argostranslate.package
import argostranslate.translate

def download_models():
    print("Fetching available packages...")
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()

    target_languages = ['hi', 'es', 'fr', 'de', 'zh', 'tr', 'cs']
    
    for lang in target_languages:
        print(f"\nLooking for package: {lang} -> en")
        # Find the package (from -> en)
        package = next(
            (p for p in available_packages if p.from_code == lang and p.to_code == 'en'),
            None
        )
        
        if package:
            print(f"Downloading {package.from_name} -> {package.to_name}...")
            package.install()
            print("Installed successfully.")
        else:
            print(f"Error: Could not find translation package for {lang} -> en")

if __name__ == "__main__":
    download_models()
    print("\nAll required translation models are setup!")
