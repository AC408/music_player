package com.example.musicplayer;

import androidx.appcompat.app.AppCompatActivity;

import android.Manifest;
import android.app.ActivityManager;
import android.content.pm.PackageManager;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.SeekBar;
import android.widget.TextView;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }

    private static final String[] PERMISSIONS = {
        Manifest.permission.READ_EXTERNAL_STORAGE
    };

    private static final int REQUEST_PERMISSIONS = 12345;
    private static final int PERMISSIONS_COUNT = 1;
    private boolean arePermissionDenied(){
        for(int i = 0; i < PERMISSIONS_COUNT; i++){
            if(checkSelfPermission(PERMISSIONS[i]) != PackageManager.PERMISSION_GRANTED){
                return true;
            }
        } return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults){
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if(arePermissionDenied()){
            ((ActivityManager)(this.getSystemService(ACTIVITY_SERVICE))).clearApplicationUserData();
            recreate();
        } else{
            onRestart();
        }
    }

    private boolean isMusicPlayerInit;
    private List<String> musicFilesList;

    private void addMusicFilesFrom(String dirPath){
        final File musicDir = new File(dirPath);
        if(!musicDir.exists()){
            musicDir.mkdir();
            return;
        }
        final File[] files = musicDir.listFiles();
        for(File file : files){
            final String path = file.getAbsolutePath();
            if(path.endsWith(".mp3")){
                musicFilesList.add(path);
            }
        }
    }

    private void fillMusicList(){
        musicFilesList.clear();
        addMusicFilesFrom(String.valueOf(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_MUSIC)));
        addMusicFilesFrom(String.valueOf(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS)));
    }

    private MediaPlayer mp;
    private PlaybackParams pp;


    private int playMusicFile(String path){
        mp = new MediaPlayer();
        try{
            mp.setDataSource(path);
            mp.prepare();
            mp.start();
        } catch(Exception e){
            e.printStackTrace();
        }
        return mp.getDuration();
    }

    private int songPosition;
    private volatile boolean isSongPlaying;
    private int mPosition;
    private boolean firstPlay = true;
    private int playBack = 2; //change place
//change to go back -> shouldn't spawn new thread everytimes it's called -> make a first boolean to block
    private void playSong(){
        final String musicFilePath = musicFilesList.get(mPosition);
        final int songDuration = playMusicFile(musicFilePath)/1000;
        seekBar.setMax(songDuration);
        seekBar.setVisibility(View.VISIBLE);
        playbackControls.setVisibility(View.VISIBLE);
        int durRemainder = songDuration%60;
        String dur = "";
        if(durRemainder<10){
            dur = "0";
        }
        songDurationTextView.setText(String.valueOf(songDuration/60)+":"+dur
                +String.valueOf(songDuration%60));
        if(firstPlay){
            mp.setVolume(0.5f,0.5f);
            pp = mp.getPlaybackParams();
            pp.setSpeed(1.0f*playBack);
            mp.setPlaybackParams(pp);

        }
        new Thread(){
            public void run(){
                songPosition = 0;
                isSongPlaying = true;
                while(songPosition<songDuration){
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    if(isSongPlaying) {
                        songPosition+= 1*playBack;
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                seekBar.setProgress(songPosition);
                                int posRemainder = songDuration%60;
                                String pos = "";
                                if(posRemainder<10){
                                    pos = "0";
                                }
                                songPositionTextView.setText(String.valueOf(songPosition / 60) + ":"+pos
                                        + String.valueOf(songPosition % 60));
                            }
                        });
                    }
                }
//                runOnUiThread(new Runnable() {
//                    @Override
//                    public void run() {
                        mPosition++;
                        mp.pause();
//                        songPosition = 0;
//                        mp.seekTo(songPosition);
                        songPositionTextView.setText("0");
                        isSongPlaying = false;
//                        seekBar.setProgress(songPosition);
//                        pauseButton.setText("play");
//                playSong();
//                    }
//                });
            }
        }.start();
    }

    private TextView songPositionTextView;
    private TextView songDurationTextView;
    private SeekBar seekBar;
    private View playbackControls;
    private Button pauseButton;


    //when app is active
    @Override
    protected void onResume(){
        super.onResume();
        //get permissions
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && arePermissionDenied()){
            requestPermissions(PERMISSIONS, REQUEST_PERMISSIONS);
            return;
        }
        if(!isMusicPlayerInit){
            final ListView listView = findViewById(R.id.listView);
            final TextAdapter textAdapter = new TextAdapter();
            musicFilesList = new ArrayList<>();
            fillMusicList();
            textAdapter.setData(musicFilesList);
            listView.setAdapter(textAdapter);
            seekBar = findViewById(R.id.seekBar);
            seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                int songProgress;

                @Override
                public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                    songProgress = progress;

                }

                @Override
                public void onStartTrackingTouch(SeekBar seekBar) {

                }

                @Override
                public void onStopTrackingTouch(SeekBar seekBar) {
                    songPosition = songProgress;
                    mp.seekTo(songProgress*1000);
                }
            });

            songPositionTextView = findViewById(R.id.currentPosition);
            songDurationTextView = findViewById(R.id.songDuration);
            pauseButton = findViewById(R.id.pauseButton);
            playbackControls = findViewById(R.id.playBackButton);

            pauseButton.setOnClickListener(new View.OnClickListener(){
                @Override
                public void onClick(View v){
                    if(isSongPlaying){
                        mp.pause();
                        pauseButton.setText("play");
                    } else {
                        if(songPosition==0){
                            playSong();
                        }else{
                            mp.start();
                        }
                        pauseButton.setText("pause");
                    } isSongPlaying = !isSongPlaying;
                }
            });

            listView.setOnItemClickListener(new AdapterView.OnItemClickListener(){
                @Override
                //clicking the music name
                public void onItemClick(AdapterView<?> parent, View view, int position, long id){
                    mPosition = position;
                    playSong();
                }
            });

            SeekBar volumeBar;
            // Volume Bar
            volumeBar = (SeekBar) findViewById(R.id.volumeBar);
            volumeBar.setOnSeekBarChangeListener(
                    new SeekBar.OnSeekBarChangeListener() {
                        @Override
                        public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                            float volumeNum = progress / 100f;
                            mp.setVolume(volumeNum, volumeNum);
                        }

                        @Override
                        public void onStartTrackingTouch(SeekBar seekBar) {

                        }

                        @Override
                        public void onStopTrackingTouch(SeekBar seekBar) {

                        }
                    }
            );


            isMusicPlayerInit = true;
        }
    }

    class TextAdapter extends BaseAdapter{
        private List<String> data = new ArrayList<>();

        void setData(List<String> mData){
            data.clear();
            data.addAll(mData);
            notifyDataSetChanged();
        }

        @Override
        public int getCount(){
            return data.size();
        }

        @Override
        public String getItem(int position){
            return null;
        }

        @Override
        public long getItemId(int position){
            return 0;
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent){
            if(convertView == null){
                convertView = LayoutInflater.from(parent.getContext()).
                        inflate(R.layout.item, parent, false);
                convertView.setTag(new ViewHolder((TextView) convertView.findViewById(R.id.myItem)));
            }
            ViewHolder holder = (ViewHolder) convertView.getTag();
            final String item = data.get(position);
            holder.info.setText(item.substring(item.lastIndexOf('/')+1));
            return convertView;
        }

        class ViewHolder{
            TextView info;

            ViewHolder(TextView mInfo){
                info = mInfo;
            }
        }
    }
}
