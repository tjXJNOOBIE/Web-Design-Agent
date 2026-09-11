import org.gradle.jvm.application.tasks.CreateStartScripts

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
    applicationName = "web-design-agent-mcp"
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

val javaRuntimeClasspath = files(tasks.named("jar")) + configurations.runtimeClasspath.get()

val cliStartScripts by tasks.registering(CreateStartScripts::class) {
    applicationName = "web-design-agent"
    mainClass.set("org.tavall.webdesign.cli.WebDesignCliApplication")
    outputDir = layout.buildDirectory.dir("scripts/cli").get().asFile
    classpath = javaRuntimeClasspath
}

val evaluationStartScripts by tasks.registering(CreateStartScripts::class) {
    applicationName = "web-design-agent-eval"
    mainClass.set("org.tavall.webdesign.evaluation.WebDesignEvaluationApplication")
    outputDir = layout.buildDirectory.dir("scripts/evaluation").get().asFile
    classpath = javaRuntimeClasspath
}

distributions {
    named("main") {
        contents {
            from(cliStartScripts) {
                into("bin")
            }
            from(evaluationStartScripts) {
                into("bin")
            }
        }
    }
}

tasks.register<JavaExec>("runCli") {
    group = "application"
    description = "Run the Java-owned Web Design Agent CLI."
    mainClass.set("org.tavall.webdesign.cli.WebDesignCliApplication")
    classpath = sourceSets.main.get().runtimeClasspath
    standardInput = System.`in`
}

tasks.register<JavaExec>("runEvaluation") {
    group = "application"
    description = "Run the Java-owned Web Design Agent one-shot evaluation corpus."
    mainClass.set("org.tavall.webdesign.evaluation.WebDesignEvaluationApplication")
    classpath = sourceSets.main.get().runtimeClasspath
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-parameters")
}

tasks.test {
    useJUnitPlatform()
}
