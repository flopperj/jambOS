import os, os.path, shutil
from shutil import copyfile, copytree, rmtree

YUI_COMPRESSOR = 'yuicompressor-2.4.7.jar'

def compress(in_files, out_file, in_type='js', verbose=False,
             temp_file='.temp'):
    temp = open(temp_file, 'w')
    for f in in_files:
        fh = open(f)
        data = fh.read() + '\n'
        fh.close()

        temp.write(data)

        print ' + %s' % f
    temp.close()

    options = ['-o "%s"' % out_file,
               '--type %s' % in_type]

    if verbose:
        options.append('-v')

    os.system('java -jar "%s" %s "%s"' % (YUI_COMPRESSOR,
                                          ' '.join(options),
                                          temp_file))

    org_size = os.path.getsize(temp_file)
    new_size = os.path.getsize(out_file)

    print '=> %s' % out_file
    print 'Original: %.2f kB' % (org_size / 1024.0)
    print 'Compressed: %.2f kB' % (new_size / 1024.0)
    print 'Reduction: %.1f%%' % (float(org_size - new_size) / org_size * 100)
    print ''

SCRIPTS = [
           "../globals.js",
           "../utils.js",
           "../host/control.class.js",
           "../host/device.class.js",
           "../host/memory.class.js",
           "../host/cpu.class.js",
           "../os/memorymanager.class.js",
           "../os/processManager.class.js",
           "../os/interrupt.class.js",
           "../os/canvastext.js",
           "../os/console.class.js",
           "../os/devicedriver.class.js",
           "../os/devicedriverkeyboard.class.js",
           "../os/queue.class.js",
           "../os/processqueue.class.js",
           "../os/systemservices.class.js",
           "../os/shellcommand.class.js",
           "../os/usercommand.class.js",
           "../os/shell.class.js",
           "../os/kernel.class.js",
           "../os/processcontrolblock.class.js"
           ]
SCRIPTS_OUT_DEBUG = 'jambOS.all.js'
SCRIPTS_OUT = 'jambOS.all.min.js'

STYLESHEETS = [
    '../../styles/jambOS.css',
    ]
STYLESHEETS_OUT = '../../styles/jambOS.min.css'

def main():
    print 'Compressing JavaScript...'
    compress(SCRIPTS, SCRIPTS_OUT, 'js', False, SCRIPTS_OUT_DEBUG);

    print 'Compressing CSS...';
    compress(STYLESHEETS, STYLESHEETS_OUT, 'css');

if __name__ == '__main__':
    main()