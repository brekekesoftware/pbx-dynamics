function recordingFileAudioTag(executionContext) {
  logger({ executionContext });

  awaitDom(function () {
    var formContext = executionContext.getFormContext();
    var control = formContext.getControl('new_recordingfile');
    var url = control.getValue();
    logger('url', url);

    if (!url) return true;

    var id = control.controlDescriptor.DomId;
    var doc = parent.document;
    var input = doc.querySelector(`#${id} input`);
    logger('input', { id, input });

    if (!input) return false;
    logger('start audio tag injection');

    var audio = doc.createElement('audio');
    audio.controls = true;
    audio.src = url;
    audio.preload = 'none';
    audio.style.height = '32px';
    audio.style.width = '100%';
    input.parentNode.appendChild(audio);
    input.remove();
    logger('end audio tag injection');
    return true;
  });
}

function logger(...args) {
  console.log('recordingFileAudioTag', ...args);
}

function awaitDom(callback, current) {
  setTimeout(function () {
    current = current || 0;
    if (callback() || current > 100) return;

    current++;

    logger('awaitDom', { current });

    awaitDom(callback, current);
  }, 1000);
}
