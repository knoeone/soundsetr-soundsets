
const MAX_SIZE_AUDIO = 5 * 1024 * 1024 // 5 MB
const MAX_SIZE_ICON = 1 * 1024 * 1024 // 1 MB

module.exports = async ({ github, context }) => {
  const plist = require('plist')
  const fs = require('fs')
  const mime = require('mime-types')

  const pull_number = context.payload.pull_request.number
  //console.log(context.payload.pull_request)
  const { owner, repo } = context.repo
  const files = await github.rest.pulls.listFiles({ owner, repo, pull_number });
  //console.log(files.data)

  const dirs = [...new Set(files.data.map(d => d.filename.split('/')[1]).filter(d => d.indexOf('.eragesoundset') > -1))]
  const paths = files.data.map(d => d.filename)

  if (!dirs.length) {
    console.log('⛔️ No soundsets found in this PR')
    process.exit(1)
  }

  // console.log(dirs)

  const allowedFiles = []

  dirs.forEach(dir => {
    const list = plist.parse(fs.readFileSync(`./soundsets/${dir}/soundset.plist`, 'utf-8'));
    if (!dirs.length) {
      console.log('⛔️ No or invalid soundset.plist')
      process.exit(1)
    }

    const filenames = [
      'SoundFile_MailError',
      'SoundFile_MailSent',
      'SoundFile_NewMail',
      'SoundFile_NoMail',
      'SoundFile_Reminder',
      'SoundFile_Welcome'
    ]

    const required = [
      'SoundSetFileFormatVersion',
      ...filenames
    ]

    const additional = [
      'SoundSetFileFormatVersion',
      'SoundSetUserString',
      'SoundSetURL',
      'SoundSetDownloadURL',
      'SoundSetIconURL',
    ]

    required.forEach(key => {
      if (!required.includes(key)) {
        console.log(`⛔️ Missing required plist key: ${key}`)
        process.exit(1)
      }
    })

    Object.keys(list).forEach(key => {
      if (!required.includes(key) && !additional.includes(key)) {
        console.log(`⛔️ Unexpected plist key: ${key}`)
        process.exit(1)
      }
    })

    allowedFiles.push(`soundsets/${dir}/README.md`)
    allowedFiles.push(`soundsets/${dir}/soundset.plist`)

    if (list.SoundSetIconURL)  {
      if (!paths.includes(`soundsets/${dir}/${list[file]}`)) {
        console.log(`⛔️ Missing icon file: ${list[file]}`)
        process.exit(1)
      }
      const stats = fs.statSync(`soundsets/${dir}/${list[file]}`)
      const size = parseInt(stats.size) / 1024 / 1024
      if (size > MAX_SIZE_ICON) {
        console.log(`⛔️ Icon file too large: ${list[file]} @ ${size}`)
        process.exit(1)
      }
      const type = mime.lookup(`soundsets/${dir}/${list[file]}`)
      if (type !== 'image/png' && type !== 'image/jpeg' && type !== 'image/jpg') {
        console.log(`⛔️ Icon file must be PNG or JPEG: ${list[file]} @ ${type}`)
        process.exit(1)
      }
      allowedFiles.push(`soundsets/${dir}/${list[file]}`)
    }

    filenames.forEach(file => {
      if (!paths.includes(`soundsets/${dir}/${list[file]}`)) {
        console.log(`⛔️ Missing sound file: ${list[file]}`)
        process.exit(1)
      }
      const stats = fs.statSync(`soundsets/${dir}/${list[file]}`)
      const size = parseInt(stats.size) / 1024 / 1024
      if (size > MAX_SIZE_AUDIO) {
        console.log(`⛔️ Sound file too large: ${list[file]} @ ${size}`)
        process.exit(1)
      }
      const type = mime.lookup(`soundsets/${dir}/${list[file]}`)
      if (type !== 'audio/aiff' && type !== 'audio/wav' && type !== 'audio/wave') {
        console.log(`⛔️ Audio file must be WAV or AIFF: ${list[file]} @ ${type}`)
        process.exit(1)
      }
      allowedFiles.push(`soundsets/${dir}/${list[file]}`)
    })
    console.log(list)
  })

  paths.filter(path => !allowedFiles.includes(path)).forEach(path => {
    console.log(`⛔️ Forbidden file: ${path}`)
    process.exit(1)
  })

  // @todo check for owner by filename

  console.log('✅ All checks passed')

  // const blob = await github.rest.git.createBlob({
  //   owner,
  //   repo,
  //   content,
  //   encoding: 'base64',
  // })

  // const tree = await github.rest.git.createTree({
  //   owner,
  //   repo,
  //   tree: process.env.GITHUB_SHA,
  // })

  // const commit = await github.rest.git.createCommit({
  //   owner,
  //   repo,
  //   message: 'Updated soundsets.json',
  //   tree: process.env.GITHUB_SHA,
  // })

  // const oldAsset = await github.rest.repos.getContent({
  //   owner,
  //   repo,
  //   path: `soundsets.json`,
  // });

  // const asset = await github.rest.repos.createOrUpdateFileContents({
  //   owner,
  //   repo,
  //   path: `soundsets.json`,
  //   message: 'Updated soundsets.json',
  //   content: Buffer.from(JSON.stringify(json)).toString('base64'),
  //   sha: oldAsset.data.sha,
  //   branch: context.payload.pull_request.head.ref,
  // })
}