plugins {
    java
    application
    id("org.tavall.architecture-tests") version "0.1.0-SNAPSHOT"
}

group = "org.tavall.webdesign"
version = "0.3.0-SNAPSHOT"

java {
    toolchain.languageVersion = JavaLanguageVersion.of(25)
}

application {
    mainClass.set("org.tavall.webdesign.mcp.WebDesignMcpApplication")
}

repositories {
    mavenLocal()
    mavenCentral()
    val githubToken = providers.environmentVariable("GITHUB_TOKEN").orNull
    if (!githubToken.isNullOrBlank()) {
        listOf("function-catalog", "tavall-di").forEach { repository ->
            maven("https://maven.pkg.github.com/TavallStudios/$repository") {
                name = "github${repository.replace("-", "")}"
                credentials {
                    username = providers.environmentVariable("GITHUB_ACTOR").orElse("github").get()
                    password = githubToken
                }
            }
        }
    }
}

val functionCatalogVersion = providers.gradleProperty("functionCatalogVersion").orElse("1.0.1")
val tavallDiVersion = providers.gradleProperty("tavallDiVersion").orElse("1.0.0")

configurations.configureEach {
    resolutionStrategy.cacheChangingModulesFor(0, "seconds")
}

dependencies {
    implementation("org.tavall:strands-agent-provider:${functionCatalogVersion.get()}")
    implementation("org.tavall:ai-core:${functionCatalogVersion.get()}")
    implementation("org.tavall:mcp-server:${functionCatalogVersion.get()}")
    implementation("org.tavall:tavall-di:${tavallDiVersion.get()}")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.20.1")
    implementation("org.apache.tomcat.embed:tomcat-embed-core:11.0.20")

    testImplementation(platform("org.junit:junit-bom:5.11.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.assertj:assertj-core:3.27.7")
    testImplementation("io.modelcontextprotocol.sdk:mcp-core:1.0.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

architectureTests {
    modules.set(listOf("core", "patterns", "di", "runtime"))
}

val buildMcpApp by tasks.registering(Exec::class) {
    workingDir(layout.projectDirectory)
    inputs.files(
        "package.json",
        "package-lock.json",
        "vite.config.ts",
        fileTree("src/mcp-app")
    )
    outputs.file(layout.projectDirectory.file("dist/mcp-app.html"))
    commandLine("npm", "run", "build:app")
}

tasks.processResources {
    dependsOn(buildMcpApp)
    from(layout.projectDirectory.file("dist/mcp-app.html")) {
        into("web-design-agent")
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-parameters")
}

tasks.test {
    useJUnitPlatform()
}
