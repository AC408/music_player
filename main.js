package com.example.musicplayer;

import androidx.annotation.MainThread;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.app.ActivityManager;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Collections;

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
    private List<String> musicFilesName;

    private void addMusicFilesFrom(String dirPath){ //directory is Music file in Phone Storage
        final File musicDir = new File(dirPath);
        if(!musicDir.exists()){
            musicDir.mkdir();
            return;
        }
        final File[] files = musicDir.listFiles();
        for(File file : files){
            final String path = file.getAbsolutePath();
            if(path.endsWith(".mp3")||path.endsWith(".mpeg")){
                musicFilesList.add(path);
                musicFilesName.add(path);
            }
        }
    }

    //fills arraylist with music directory path
    private void fillMusicList(){
        musicFilesList.clear();
        musicFilesName.clear();
        addMusicFilesFrom(String.valueOf(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_MUSIC)));
        addMusicFilesFrom(String.valueOf(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS)));
        Collections.sort(musicFilesList);
        Collections.sort(musicFilesName);
    }

    private MediaPlayer mp; //music object
    private PlaybackParams pp; //for playback speed

    //plays music, sets default value (volume, playback speed)
    private int playMusicFile(String path){
        mp = new MediaPlayer();
        try{
            mp.setDataSource(path);
            mp.prepare();
            mp.start();
            pp = mp.getPlaybackParams();
            pp.setSpeed((float)((float)playSpeed/50));
            mp.setPlaybackParams(pp);
        } catch(Exception e){
            e.printStackTrace();
        }
        mp.setVolume(volume,volume);
        return mp.getDuration();
    }

    private int songPosition;
    private volatile boolean isSongPlaying;
    private int mPosition = 0; //position of song
    private boolean firstPlay = true; //only occurs once
    private int playSpeed = 50; //change place

    private TextView songPositionTextView;
    private TextView songDurationTextView;
    private SeekBar seekBar; //for song position
    private View playbackControls;
    private Button pauseButton;
    private playMusic current; //curent music being played
    private int lastSong = 0;
    private SeekBar playback;
    private TextView playbackText;
    private int songPos = 0;
    private boolean next = true;
    private LinearLayout listView;
    private float volume = 0.5f;
    private boolean loop = false;
    private Button loopBtn;
    private Button nextBtn;
    private Button prevBtn;
    private TextView[] musicList;
    private ScrollView scroller;
    private SeekBar verticalScroll;
    private Button randomBtn;
    private View playbackEffects;

    //when app is active
    @Override
    protected void onResume(){
        super.onResume();
        //get permissions
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && arePermissionDenied()){
            requestPermissions(PERMISSIONS, REQUEST_PERMISSIONS);
            return;
        }
        if(!isMusicPlayerInit){ //initialized
            scroller = findViewById(R.id.scrollView);
            final TextAdapter storeName = new TextAdapter();
            final TextAdapter textAdapter = new TextAdapter();
            listView = findViewById(R.id.listView);
            musicFilesList = new ArrayList<>();
            musicFilesName = new ArrayList<>();
            fillMusicList();
            for(int i = 0; i<musicFilesName.size(); i++){ //remove file type in title
                String name = musicFilesName.get(i);
                int dot = musicFilesName.get(i).lastIndexOf(".");
                int slash = musicFilesName.get(i).lastIndexOf("/")+1;
                name = name.substring(slash,dot);
                musicFilesName.set(i,name);
            }
            storeName.setData(musicFilesName);
            textAdapter.setData(musicFilesList);
            musicList = new TextView[musicFilesList.size()];
            for(int i = 0; i<musicFilesList.size(); i++){
                musicList[i] = new TextView(getApplication());
                musicList[i].setLines(3);
                musicList[i].setTextColor(Color.BLACK);
                musicList[i].setGravity(Gravity.CENTER);
                musicList[i].setText(musicFilesName.get(i));
                musicList[i].setBackgroundResource(R.drawable.border);
                listView.addView(musicList[i],i,new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

                final int finalI = i;
                musicList[i].setOnClickListener(new View.OnClickListener(){
                    @Override
                    public void onClick(View v){
                        mPosition = finalI;
                        if(firstPlay){
                            lastSong = finalI;
                        }
                        if(firstPlay){ //first one clicked when app is started
                            current = new playMusic(mPosition); //makes sure only 1 object and 1 thread is made
                            current.start(); //starts thread
                            firstPlay = false;
                        } else {
                            current.playTrack(); //switching song, resets song
                        }

                    }
                });
            }

            scroller.getViewTreeObserver().addOnScrollChangedListener(new ViewTreeObserver.OnScrollChangedListener() {

                @Override
                public void onScrollChanged() {
                    int max = scroller.getChildAt(0).getHeight()-scroller.getHeight();
                    double step = (double)max/(double)verticalScroll.getMax();
                    int scrollY = scroller.getScrollY(); //for verticalScrollView
                    verticalScroll.setProgress((int)(scrollY/step));
                }
            });

            seekBar = findViewById(R.id.seekBar); //music position
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
                    current.updateProgress(); //updates position label
                }
            });

            playbackControls = findViewById(R.id.playControl); //layout
            playbackEffects = findViewById(R.id.playEffects); //layout
            verticalScroll = findViewById(R.id.verticalScroll); //scroll
            songPositionTextView = findViewById(R.id.currentPosition); //text
            songDurationTextView = findViewById(R.id.songDuration); //text
            playbackText = findViewById(R.id.playbackText); //text
            pauseButton = findViewById(R.id.pauseButton); //btn
            loopBtn = findViewById(R.id.loopButton); //btn
            nextBtn = findViewById(R.id.nextBtn); //btn
            prevBtn = findViewById(R.id.prevBtn); //btn
            randomBtn = findViewById(R.id.randomButton); //btn

            verticalScroll.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                int progress;
                @Override
                public void onProgressChanged(SeekBar seekBar, int i, boolean b) {
                    int max = scroller.getChildAt(0).getHeight()-scroller.getHeight();
                    double step = (double)max/(double)verticalScroll.getMax();
                    progress = (int)(i*step);
                    scroller.scrollTo(0,progress);
                }

                @Override
                public void onStartTrackingTouch(SeekBar seekBar) {

                }

                @Override
                public void onStopTrackingTouch(SeekBar seekBar) {
                }
            });

            playback = findViewById(R.id.playBack);
            playback.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                int speed;
                @Override
                public void onProgressChanged(SeekBar seekBar, int progress, boolean b) {
                    speed = progress;
                    playbackText.setText("playback speed: "+String.valueOf((double)speed/50));
                }

                @Override
                public void onStartTrackingTouch(SeekBar seekBar) {
                }

                @Override
                public void onStopTrackingTouch(SeekBar seekBar) {
                    playSpeed = speed;
                    if(mp!=null) {
                        next = false;
                        songPos = mp.getCurrentPosition();
                        current.playTrack();
                        songPosition = songPos / 1000;
                        mp.seekTo(songPos);
                        next = true;
                    }
                }
            });

            pauseButton.setOnClickListener(new View.OnClickListener(){ //when btn is clicked
                @Override
                public void onClick(View v){
                    if(isSongPlaying){
                        mp.pause(); //stops song if song is playing
                        pauseButton.setText("play");
                    } else {
                        mp.start(); //starts song
                        pauseButton.setText("pause");
                    } isSongPlaying = !isSongPlaying;
                }
            });

            prevBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    mPosition--;
                    if(mPosition<0){
                        mPosition = musicFilesList.size()-1;
                    }
                    current.playTrack();
                }
            });

            nextBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    mPosition++;
                    if(mPosition>(musicFilesList.size()-1)){
                        mPosition = 0;
                    }
                    current.playTrack();
                }
            });

            loopBtn.setOnClickListener(new View.OnClickListener(){
                @Override
                public void onClick(View v){
                    loop = !loop;
                    if(loop){
                        mp.setLooping(true);
                        loopBtn.setText("continue");
                    } else {
                        mp.setLooping(false);
                        loopBtn.setText("loop");
                    }
                }
            });

            randomBtn.setOnClickListener(new View.OnClickListener(){
                @Override
                public void onClick(View v){

                }
            });

            SeekBar volumeBar;
            // Volume Bar
            volumeBar = (SeekBar) findViewById(R.id.volumeBar);
            volumeBar.setOnSeekBarChangeListener(
                    new SeekBar.OnSeekBarChangeListener() {
                        @Override
                        public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                            volume = progress / 100f;
                            if(mp!=null){
                                mp.setVolume(volume, volume);
                            }
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

    class playMusic extends Thread { //update music labels (position, number, etc)
        String musicFilePath;
        int songDuration;
        playMusic(int position){
            reset(); //resets music object
            //visible position track and btns
            seekBar.setVisibility(View.VISIBLE);
            playbackControls.setVisibility(View.VISIBLE);
            nextBtn.setVisibility(View.VISIBLE);
            prevBtn.setVisibility(View.VISIBLE);
            playbackEffects.setVisibility(View.VISIBLE);
        }
        public void run(){
            isSongPlaying = true;
            while(true){
                while(songPosition<songDuration){ //plays this song
                    try {
                        Thread.sleep(50000/playSpeed); //increments in 1s
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    if(isSongPlaying) {
                        songPosition+= 1; //1s passed
                        seekBar.setProgress(songPosition);
                        updateProgress(); //update pos label
                    }
                }
                if(loop){
                    mp.seekTo(0);
                    mp.start();
                    songPosition = 0;
                    seekBar.setProgress(songPosition);
                    updateProgress();
                }
                if(!loop && next){
                    mPosition++; //goes to next music
                    //reset
                    songPositionTextView.setText("0");
                    playTrack();
                }
            }
        }
        public void playTrack(){
            mp.pause();
            mp.release();
            reset();
        }
        public void reset(){
            if(mPosition >= musicFilesList.size()){ //wrap -> out of bound error fixed
                mPosition = 0;
            }
            musicFilePath  = musicFilesList.get(mPosition); //get music file
            runOnUiThread(new Runnable(){
                @Override
                public void run(){
                    musicList[lastSong].setBackgroundResource(R.drawable.border);
                    musicList[mPosition].setBackgroundColor(Color.GRAY);
                    lastSong = mPosition;
                }
            });
            songPosition = 0;
            songDuration = playMusicFile(musicFilePath)/1000;
            seekBar.setMax(songDuration);
            seekBar.setProgress(0);
            pauseButton.setText("pause");
            isSongPlaying = true;
            //sets label
            int durRemainder = songDuration%60;
            String dur = "";
            if(durRemainder<10){ //makes sure number is consistent: 01 over 1
                dur = "0";
            }
            songDurationTextView.setText(String.valueOf(songDuration/60)+":"+dur
                    +String.valueOf(songDuration%60));
            updateProgress();
        }
        public void updateProgress(){ //update curr position
            int posRemainder = songPosition%60;
            String pos = "";
            if(posRemainder<10){
                pos = "0";
            }
            songPositionTextView.setText(String.valueOf(songPosition / 60) + ":"+pos
                    + String.valueOf(songPosition % 60));
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

//add new page for track controls
//random
//title on user control
//alphabet sorting
//search function

//errors -> side seek changes pos

//https://programmer.group/5c44cf15f28a9.html
//alphabetical sorting, sorting with chinese chars


//add comments
//publish
//allows rename
//allows album
//add logo
//add about page

