/*
const { execSync } = require("child_process");
const fs = require("fs");

function getLatestStableVersion(packageName) {
  try {
    const versions = JSON.parse(
      execSync(`npm view ${packageName} versions --json`).toString()
    );
    const stableVersions = versions.filter(
      (v) => !/[-.]?(alpha|beta|rc|pre|dev|snapshot|nightly)/i.test(v)
    );
    return stableVersions.length > 0 ? stableVersions.pop() : null;
  } catch (error) {
    console.error(
      `Error obteniendo versiones para ${packageName}: ${error.message}`
    );
    return null;
  }
}

function updatePackageJson() {
  const packageJsonPath = "./package.json";
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  for (const dependencyType of ["dependencies", "devDependencies"]) {
    if (packageJson[dependencyType]) {
      for (const packageName in packageJson[dependencyType]) {
        const latestStableVersion = getLatestStableVersion(packageName);
        if (latestStableVersion) {
          console.log(`Actualizando ${packageName} a ${latestStableVersion}`);
          packageJson[dependencyType][packageName] = `^${latestStableVersion}`; // Usamos ^ para el rango semántico
        }
      }
    }
  }

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  );
  console.log("package.json actualizado.");
}

updatePackageJson();
*/