import { useEffect, useRef, useState } from "react"

function LoginPage({ onLogin }) {
  const canvasRef = useRef(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  // --------------------------------------------------
  // WEBGL CYBER BACKGROUND
  // --------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")

    if (!gl) return

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;

      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fragmentShaderSource = `
      precision highp float;

      varying vec2 v_texCoord;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      float grid(vec2 uv, float spacing) {
        vec2 lines =
          abs(fract(uv / spacing - 0.5) - 0.5)
          / fwidth(uv / spacing);

        return 1.0 - min(lines.x, lines.y);
      }

      void main() {
        vec2 uv = v_texCoord;

        vec2 p =
          (v_texCoord * 2.0 - 1.0)
          * (u_resolution.y / u_resolution.x);

        vec3 color = vec3(
          0.008,
          0.024,
          0.09
        );

        float g = grid(
          uv,
          0.1
        );

        color +=
          g
          * 0.03
          * vec3(
            0.23,
            0.51,
            0.96
          );

        for(float i = 0.0; i < 8.0; i++) {

          float t =
            u_time
            * (0.1 + i * 0.05);

          vec2 pos = vec2(
            sin(t + i * 1.5) * 0.8,
            cos(t * 0.8 + i * 2.0) * 0.5
          );

          float dist =
            length(p - pos);

          float glow =
            0.02 /
            (dist * dist + 0.01);

          vec3 glowColor =
            (mod(i, 3.0) == 0.0)
              ? vec3(0.23, 0.51, 0.96)
              : (
                  (mod(i, 3.0) == 1.0)
                    ? vec3(0.64, 0.35, 0.92)
                    : vec3(0.0, 1.0, 1.0)
                );

          color +=
            glow
            * glowColor
            * 0.2;
        }

        vec2 mouseNormalized =
          u_mouse / u_resolution;

        float mouseGlow =
          0.015 /
          (
            distance(
              uv,
              mouseNormalized
            )
            + 0.03
          );

        color +=
          mouseGlow
          * vec3(
            0.15,
            0.35,
            0.9
          )
          * 0.08;

        color *=
          1.2
          - length(
              uv - 0.5
            )
          * 1.5;

        gl_FragColor =
          vec4(
            color,
            1.0
          );
      }
    `

    const createShader = (
      type,
      source
    ) => {
      const shader =
        gl.createShader(type)

      gl.shaderSource(
        shader,
        source
      )

      gl.compileShader(
        shader
      )

      return shader
    }

    const vertexShader =
      createShader(
        gl.VERTEX_SHADER,
        vertexShaderSource
      )

    const fragmentShader =
      createShader(
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
      )

    const program =
      gl.createProgram()

    gl.attachShader(
      program,
      vertexShader
    )

    gl.attachShader(
      program,
      fragmentShader
    )

    gl.linkProgram(program)

    gl.useProgram(program)

    const buffer =
      gl.createBuffer()

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      buffer
    )

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    )

    const positionLocation =
      gl.getAttribLocation(
        program,
        "a_position"
      )

    gl.enableVertexAttribArray(
      positionLocation
    )

    gl.vertexAttribPointer(
      positionLocation,
      2,
      gl.FLOAT,
      false,
      0,
      0
    )

    const timeLocation =
      gl.getUniformLocation(
        program,
        "u_time"
      )

    const resolutionLocation =
      gl.getUniformLocation(
        program,
        "u_resolution"
      )

    const mouseLocation =
      gl.getUniformLocation(
        program,
        "u_mouse"
      )

    const mouse = {
      x: 0,
      y: 0,
    }

    const resize = () => {
      const rect =
        canvas.getBoundingClientRect()

      canvas.width =
        rect.width *
        window.devicePixelRatio

      canvas.height =
        rect.height *
        window.devicePixelRatio
    }

    resize()

    window.addEventListener(
      "resize",
      resize
    )

    const handleMouseMove = (
      event
    ) => {
      const rect =
        canvas.getBoundingClientRect()

      const x =
        event.clientX -
        rect.left

      const y =
        rect.height -
        (
          event.clientY -
          rect.top
        )

      mouse.x =
        x *
        window.devicePixelRatio

      mouse.y =
        y *
        window.devicePixelRatio
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    )

    let animationFrame

    const render = (
      time
    ) => {
      gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
      )

      gl.uniform1f(
        timeLocation,
        time * 0.001
      )

      gl.uniform2f(
        resolutionLocation,
        canvas.width,
        canvas.height
      )

      gl.uniform2f(
        mouseLocation,
        mouse.x,
        mouse.y
      )

      gl.drawArrays(
        gl.TRIANGLE_STRIP,
        0,
        4
      )

      animationFrame =
        requestAnimationFrame(
          render
        )
    }

    animationFrame =
      requestAnimationFrame(
        render
      )

    return () => {
      cancelAnimationFrame(
        animationFrame
      )

      window.removeEventListener(
        "resize",
        resize
      )

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      )
    }
  }, [])

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const handleLogin = (
    event
  ) => {
    event.preventDefault()

    setError("")
    setSuccess(false)

    if (!email || !password) {
      setError(
        "Please enter your email and password."
      )

      return
    }

    setLoading(true)

    setTimeout(() => {
      if (
        email ===
          "admin@prototype.com" &&
        password ===
          "prototype123"
      ) {
        setLoading(false)
        setSuccess(true)

        setTimeout(() => {
          onLogin()
        }, 700)

        return
      }

      setLoading(false)

      setError(
        "Invalid operator ID or access key."
      )
    }, 900)
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div
      className="
        relative
        min-h-screen
        w-full
        overflow-hidden
        bg-[#020617]
        text-slate-100
      "
    >

      {/* Global grid */}
      <div
        className="
          absolute
          inset-0
          pointer-events-none
          opacity-50
        "
        style={{
          backgroundImage: `
            linear-gradient(
              to right,
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(255,255,255,0.03) 1px,
              transparent 1px
            )
          `,
          backgroundSize:
            "40px 40px",
        }}
      />

      {/* Main */}
      <div
        className="
          relative
          z-10
          min-h-screen
          flex
        "
      >

        {/* ==================================================
            LEFT
        ================================================== */}

        <section
          className="
            hidden
            lg:flex
            lg:w-1/2
            min-h-screen
            relative
            overflow-hidden
            border-r
            border-slate-800
            bg-[#070d1f]
          "
        >

          {/* WebGL */}
          <canvas
            ref={canvasRef}
            className="
              absolute
              inset-0
              w-full
              h-full
              opacity-70
            "
          />

          {/* overlay */}
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-[#020617]/80
              via-[#020617]/20
              to-transparent
            "
          />

          {/* Left content */}
          <div
            className="
              relative
              z-10
              flex
              flex-col
              justify-center
              w-full
              px-12
              xl:px-20
              py-12
            "
          >

            {/* Brand */}
            <div
              className="
                flex
                items-center
                gap-3
                mb-12
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-xl
                  border
                  border-blue-400/30
                  bg-blue-500/10
                  flex
                  items-center
                  justify-center
                  shadow-[0_0_25px_rgba(59,130,246,0.15)]
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  className="
                    w-6
                    h-6
                    text-blue-300
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="
                      M12 3
                      19 6
                      V11
                      C19 16
                      15.5 19.5
                      12 21
                      C8.5 19.5
                      5 16
                      5 11
                      V6
                      L12 3Z
                    "
                  />

                  <path
                    d="
                      M9 12
                      L11 14
                      L15 10
                    "
                  />
                </svg>
              </div>

              <div>
                <p
                  className="
                    text-xs
                    text-blue-300
                    tracking-[0.25em]
                    font-semibold
                  "
                >
                  PROTOTYPE
                </p>

                <p
                  className="
                    font-bold
                    text-lg
                    tracking-tight
                  "
                >
                  EMAIL
                </p>
              </div>

            </div>

            {/* Headline */}
            <div
              className="
                max-w-xl
              "
            >

              <h1
                className="
                  text-5xl
                  xl:text-6xl
                  font-bold
                  tracking-tight
                  leading-[1.08]
                "
              >
                Detect threats.
                <br />

                <span
                  className="
                    bg-gradient-to-r
                    from-blue-300
                    via-cyan-300
                    to-purple-300
                    bg-clip-text
                    text-transparent
                  "
                >
                  Understand why.
                </span>
              </h1>

              <p
                className="
                  mt-6
                  text-lg
                  text-slate-400
                  leading-relaxed
                  max-w-lg
                "
              >
                Access the threat
                intelligence console.
                Correlate suspicious
                artifacts with forensic
                analysis and explainable
                risk assessment.
              </p>

              {/* Pipeline */}
              <div
                className="
                  mt-12
                  rounded-2xl
                  border
                  border-white/10
                  bg-slate-900/60
                  backdrop-blur-xl
                  p-6
                  shadow-2xl
                "
              >

                <p
                  className="
                    text-xs
                    text-slate-500
                    tracking-[0.2em]
                    mb-6
                  "
                >
                  ANALYSIS PIPELINE
                </p>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >

                  <PipelineNode
                    label="Ingest"
                    type="email"
                  />

                  <PipelineLine
                    color="#4cd7f6"
                  />

                  <PipelineNode
                    label="Analyze"
                    type="analysis"
                  />

                  <PipelineLine
                    color="#ddb7ff"
                  />

                  <PipelineNode
                    label="Correlate"
                    type="correlate"
                  />

                  <PipelineLine
                    color="#EF4444"
                  />

                  <PipelineNode
                    label="Detect"
                    type="detect"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* Left footer */}
          <div
            className="
              absolute
              z-20
              left-12
              xl:left-20
              bottom-8
              flex
              items-center
              gap-3
              text-[11px]
              text-slate-600
              tracking-widest
            "
          >
            <span>
              V 1.0.0
            </span>

            <span
              className="
                w-1
                h-1
                rounded-full
                bg-slate-600
              "
            />

            <span>
              SECURE SOC NODE
            </span>
          </div>

        </section>

        {/* ==================================================
            RIGHT
        ================================================== */}

        <section
          className="
            relative
            flex
            flex-1
            min-h-screen
            items-center
            justify-center
            px-6
            py-12
          "
        >

          {/* Glow */}
          <div
            className="
              absolute
              top-1/4
              right-1/4
              w-[350px]
              h-[350px]
              rounded-full
              bg-blue-600/10
              blur-[120px]
              pointer-events-none
            "
          />

          <div
            className="
              absolute
              bottom-1/4
              left-1/4
              w-[300px]
              h-[300px]
              rounded-full
              bg-purple-600/10
              blur-[120px]
              pointer-events-none
            "
          />

          {/* Status */}
          <div
            className="
              absolute
              top-7
              right-7
              hidden
              sm:flex
              items-center
              gap-3
              rounded-full
              border
              border-slate-700
              bg-slate-900/60
              backdrop-blur-lg
              px-4
              py-2
            "
          >

            <div
              className="
                relative
                flex
                w-3
                h-3
                items-center
                justify-center
              "
            >

              <span
                className="
                  absolute
                  inset-0
                  rounded-full
                  bg-green-400
                  animate-ping
                  opacity-40
                "
              />

              <span
                className="
                  relative
                  w-2
                  h-2
                  rounded-full
                  bg-green-400
                "
              />

            </div>

            <span
              className="
                text-[11px]
                font-semibold
                tracking-[0.16em]
                text-green-400
              "
            >
              SECURE SYSTEM ONLINE
            </span>

          </div>

          <div
            className="
              relative
              z-10
              w-full
              max-w-md
            "
          >

            {/* Mobile brand */}
            <div
              className="
                lg:hidden
                mb-8
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  mx-auto
                  rounded-2xl
                  bg-gradient-to-br
                  from-blue-500
                  to-purple-600
                  flex
                  items-center
                  justify-center
                  shadow-xl
                  shadow-blue-900/30
                  mb-4
                "
              >

                <svg
                  viewBox="0 0 24 24"
                  className="
                    w-7
                    h-7
                  "
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <path
                    d="
                      M12 3
                      19 6
                      V11
                      C19 16
                      15.5 19.5
                      12 21
                      C8.5 19.5
                      5 16
                      5 11
                      V6
                      L12 3Z
                    "
                  />

                  <path
                    d="
                      M9 12
                      L11 14
                      L15 10
                    "
                  />
                </svg>

              </div>

              <h1
                className="
                  text-2xl
                  font-bold
                "
              >
                Threat Lens Prototype
              </h1>

              <p
                className="
                  text-slate-500
                  text-sm
                  mt-1
                "
              >
                Threat Intelligence Console
              </p>

            </div>

            {/* Border glow */}
            <div
              className="
                absolute
                -inset-[1px]
                rounded-[25px]
                bg-gradient-to-br
                from-blue-500/50
                via-transparent
                to-purple-500/50
                blur-[1px]
              "
            />

            {/* Login card */}
            <div
              className="
                relative
                rounded-[24px]
                border
                border-white/10
                bg-slate-900/75
                backdrop-blur-2xl
                p-8
                shadow-2xl
                shadow-black/40
              "
            >

              {/* Accent */}
              <div
                className="
                  absolute
                  top-0
                  left-10
                  right-10
                  h-[2px]
                  bg-gradient-to-r
                  from-transparent
                  via-blue-400
                  to-transparent
                  opacity-60
                "
              />

              {/* Login heading */}
              <div
                className="
                  mb-8
                "
              >

                <div
                  className="
                    sm:hidden
                    flex
                    items-center
                    gap-2
                    mb-4
                  "
                >
                  <span
                    className="
                      w-2
                      h-2
                      rounded-full
                      bg-green-400
                      animate-pulse
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      text-green-400
                      tracking-[0.16em]
                    "
                  >
                    SYSTEM ONLINE
                  </p>
                </div>

                <h2
                  className="
                    text-3xl
                    font-bold
                    tracking-tight
                  "
                >
                  Welcome back.
                </h2>

                <p
                  className="
                    mt-2
                    text-slate-400
                  "
                >
                  Authenticate to enter
                  the Analysis Console.
                </p>

              </div>

              {/* Form */}
              <form
                onSubmit={
                  handleLogin
                }
                className="
                  space-y-5
                "
              >

                {/* Email */}
                <div>

                  <label
                    className="
                      block
                      mb-2
                      text-sm
                      text-slate-300
                      font-medium
                    "
                  >
                    Operator ID / Email
                  </label>

                  <div
                    className="
                      relative
                    "
                  >

                    <div
                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-500
                      "
                    >

                      <svg
                        viewBox="0 0 24 24"
                        className="
                          w-5
                          h-5
                        "
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <circle
                          cx="12"
                          cy="8"
                          r="4"
                        />

                        <path
                          d="
                            M4 21
                            C4 16.5
                            7.5 14
                            12 14
                            C16.5 14
                            20 16.5
                            20 21
                          "
                        />
                      </svg>

                    </div>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      placeholder="admin@prototype.com"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-700
                        bg-[#020617]
                        py-3.5
                        pl-12
                        pr-4
                        outline-none
                        transition-all
                        duration-300
                        focus:border-blue-400
                        focus:ring-1
                        focus:ring-blue-400
                        focus:shadow-[0_0_18px_rgba(59,130,246,0.16)]
                      "
                    />

                  </div>

                </div>

                {/* Password */}
                <div>

                  <div
                    className="
                      flex
                      justify-between
                      items-center
                      mb-2
                    "
                  >

                    <label
                      className="
                        text-sm
                        text-slate-300
                        font-medium
                      "
                    >
                      Access Key
                    </label>

                    <button
                      type="button"
                      className="
                        text-xs
                        text-blue-300
                        hover:text-cyan-300
                        transition
                      "
                    >
                      Forgot Key?
                    </button>

                  </div>

                  <div
                    className="
                      relative
                    "
                  >

                    <div
                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2
                        text-slate-500
                      "
                    >

                      <svg
                        viewBox="0 0 24 24"
                        className="
                          w-5
                          h-5
                        "
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <circle
                          cx="8"
                          cy="15"
                          r="4"
                        />

                        <path
                          d="
                            M11 12
                            L20 3
                          "
                        />

                        <path
                          d="
                            M17 6
                            L20 9
                          "
                        />
                      </svg>

                    </div>

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder="••••••••"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-700
                        bg-[#020617]
                        py-3.5
                        pl-12
                        pr-14
                        outline-none
                        transition-all
                        duration-300
                        focus:border-blue-400
                        focus:ring-1
                        focus:ring-blue-400
                        focus:shadow-[0_0_18px_rgba(59,130,246,0.16)]
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        text-xs
                        text-slate-400
                        hover:text-white
                        transition
                      "
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </div>

                {/* Error */}
                {error && (
                  <div
                    className="
                      rounded-xl
                      border
                      border-red-900
                      bg-red-950/50
                      px-4
                      py-3
                      text-sm
                      text-red-300
                    "
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    success
                  }
                  className={`
                    w-full
                    rounded-xl
                    py-3.5
                    font-semibold
                    transition-all
                    duration-300
                    flex
                    items-center
                    justify-center
                    gap-3

                    ${
                      success
                        ? "bg-green-600 shadow-[0_0_25px_rgba(34,197,94,0.25)]"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:-translate-y-[1px] shadow-lg shadow-blue-950/30"
                    }

                    ${
                      loading
                        ? "opacity-80"
                        : ""
                    }
                  `}
                >

                  {loading && (
                    <span
                      className="
                        w-5
                        h-5
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                        animate-spin
                      "
                    />
                  )}

                  {success ? (
                    <>
                      <span>
                        ✓
                      </span>

                      Access Granted
                    </>
                  ) : loading ? (
                    "Authenticating..."
                  ) : (
                    <>
                      Enter Analysis Console

                      <span>
                        →
                      </span>
                    </>
                  )}

                </button>

              </form>

              {/* Demo Credentials */}
              <div
                className="
                  mt-8
                  pt-6
                  border-t
                  border-slate-800
                "
              >

                <div
                  className="
                    relative
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-800
                    bg-slate-950/60
                    p-4
                  "
                >

                  <div
                    className="
                      absolute
                      left-0
                      top-0
                      bottom-0
                      w-1
                      bg-cyan-400
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      tracking-[0.16em]
                      mb-3
                    "
                  >
                    DEMO ENVIRONMENT CREDENTIALS
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setEmail(
                        "admin@prototype.com"
                      )
                    }
                    className="
                      block
                      text-left
                      text-sm
                      text-slate-300
                      hover:text-blue-300
                      transition
                    "
                  >
                    <span
                      className="
                        text-slate-600
                        mr-3
                      "
                    >
                      ID
                    </span>

                    admin@prototype.com
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPassword(
                        "prototype123"
                      )
                    }
                    className="
                      block
                      mt-2
                      text-left
                      text-sm
                      text-slate-300
                      hover:text-purple-300
                      transition
                    "
                  >
                    <span
                      className="
                        text-slate-600
                        mr-3
                      "
                    >
                      KEY
                    </span>

                    prototype123
                  </button>

                </div>

              </div>

            </div>

          </div>

          {/* Footer */}
          <div
            className="
              absolute
              bottom-7
              text-center
              text-[10px]
              tracking-[0.18em]
              text-slate-700
            "
          >
            PROTOTYPE ENVIRONMENT
            <br />
            THREAT INTELLIGENCE CONSOLE
          </div>

        </section>

      </div>

      {/* CSS for moving pipeline */}
      <style>{`
        @keyframes pipelineMove {
          to {
            stroke-dashoffset: -16;
          }
        }

        .pipeline-line {
          stroke-dasharray: 5 5;
          animation: pipelineMove 1.2s linear infinite;
        }
      `}</style>

    </div>
  )
}

// ======================================================
// PIPELINE COMPONENTS
// ======================================================

function PipelineLine({ color }) {
  return (
    <div
      className="
        flex-1
        h-[2px]
        mx-2
        min-w-4
      "
    >
      <svg
        width="100%"
        height="2"
        className="
          overflow-visible
        "
      >
        <line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke={color}
          strokeWidth="2"
          className="
            pipeline-line
            opacity-60
          "
        />
      </svg>
    </div>
  )
}

function PipelineNode({
  label,
  type,
}) {
  const config = {
    email: {
      border:
        "border-slate-600",

      glow:
        "shadow-[0_0_18px_rgba(255,255,255,0.05)]",

      text:
        "text-slate-400",
    },

    analysis: {
      border:
        "border-cyan-400/30",

      glow:
        "shadow-[0_0_18px_rgba(34,211,238,0.12)]",

      text:
        "text-cyan-300",
    },

    correlate: {
      border:
        "border-purple-400/30",

      glow:
        "shadow-[0_0_18px_rgba(192,132,252,0.12)]",

      text:
        "text-purple-300",
    },

    detect: {
      border:
        "border-red-400/40",

      glow:
        "shadow-[0_0_20px_rgba(239,68,68,0.16)]",

      text:
        "text-red-400",
    },
  }

  const style =
    config[type]

  return (
    <div
      className="
        flex
        flex-col
        items-center
        gap-2
      "
    >

      <div
        className={`
          w-12
          h-12
          rounded-full
          border
          bg-slate-900/90
          flex
          items-center
          justify-center

          ${style.border}
          ${style.glow}
        `}
      >

        {type === "email" && (
          <svg
            viewBox="0 0 24 24"
            className="
              w-5
              h-5
              text-slate-400
            "
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />

            <path
              d="
                M3 7
                L12 13
                L21 7
              "
            />
          </svg>
        )}

        {type ===
          "analysis" && (
          <span
            className="
              text-cyan-300
              text-lg
            "
          >
            ◈
          </span>
        )}

        {type ===
          "correlate" && (
          <span
            className="
              text-purple-300
              text-xl
            "
          >
            ⬡
          </span>
        )}

        {type ===
          "detect" && (
          <span
            className="
              text-red-400
              text-lg
            "
          >
            !
          </span>
        )}

      </div>

      <span
        className={`
          text-[9px]
          uppercase
          tracking-[0.12em]
          ${style.text}
        `}
      >
        {label}
      </span>

    </div>
  )
}

export default LoginPage
